[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Cache Across Hierarchical Keyrings

## Affected Features

This serves as a reference of all features that this change affects.

| Feature                                                                                 |
| --------------------------------------------------------------------------------------- |
| [AWS KMS Hierarchical Keyring](../../framework/aws-kms/aws-kms-hierarchical-keyring.md) |
| [Caching Cryptographic Materials Manager](../../framework/caching-cmm.md)               |

## Affected Specifications

This serves as a reference of all specification documents that this change affects.

| Specification                                                                           |
| --------------------------------------------------------------------------------------- |
| [AWS KMS Hierarchical Keyring](../../framework/aws-kms/aws-kms-hierarchical-keyring.md) |
| [Caching Cryptographic Materials Manager](../../framework/caching-cmm.md)               |

## Affected Implementations

| Language | Version Introduced | Version Removed | Implementation                                                                                                                                                                                                                                                                                      |
| -------- | ------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dafny    | 1.7.0              | n/a             | [AwsKmsHierarchicalKeyring.dfy](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/src/Keyrings/AwsKms/AwsKmsHierarchicalKeyring.dfy)                                                          |
| Java     | 1.7.0              | n/a             | [CreateAwsKmsHierarchicalKeyringInput.java](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/java/src/main/smithy-generated/software/amazon/cryptography/materialproviders/model/CreateAwsKmsHierarchicalKeyringInput.java) |
| .NET     | 1.7.0              | n/a             | [CreateAwsKmsHierarchicalKeyringInput.cs](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/net/Generated/AwsCryptographicMaterialProviders/CreateAwsKmsHierarchicalKeyringInput.cs)                                         |

## Definitions

An "MPL Consumer" is a library, service, or other application
that uses the AWS Cryptographic Material Providers Library (MPL)
to manage cryptographic materials.
An "MPL Consumer" MAY be using an AWS Crypto Tools product,
such as the AWS Encryption SDK or AWS Database Encryption SDK.

By "KMS Relationship", we mean any or all of the following:

- KMS Configuration
- Credentials used when creating the KMS Client, and thus used when calling KMS
- Other properties of the KMS Client, such as the region, or request headers

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

To improve the MPL Consumer data key caching experience,
when using the Hierarchical Keyring,
we need to allow caching across Key Stores/KMS Clients/KMS Keys.

To facilitate caching across Key Stores/KMS Clients/KMS Keys,
we MUST break the Cryptographic Materials Cache (CMC)
out of the Hierarchical Keyring.

By allowing MPL Consumers to optionally provide an initialized shared CMC
to the Hierarchical Keyring at construction,
the CMC MAY cache Branch Keys protected by different
KMS Relationships.

This simplifies Multiple KMS Relationship MPL Consumers,
as they do not need to stand up an LRU Cache of Hierarchical Keyrings.

Instead, they may maintain one CMC.
They still create a Hierarchical Keyring instance per KMS Relationship,
and they MUST use the correct Keyring to retrieve material
from the Cache.

But they only need to maintain the common cache.

This change also means that any keyring that has access to the `Shared` cache
MAY be able to use materials that it MAY or MAY NOT have direct access to.
Therefore, it is important to carefully configure the Partition ID,
Logical Key Store Name of the Key Store for the Hierarchical Keyring, and the
Branch Key ID for the Hierarchical Keyrings sharing a cache.
Please review the [Security Implications](#security-implications) for more
information on this.

In the future, the CachingCMM will be introduced to
Crypto Tool's Dafny products.
The CachingCMM and the Hierarchical Keyring both consume CMCs.
Thus, it will be possible to provide a CMC to both a
Hierarchical Keyring & a CachingCMM.
This cache identifier design considers
how the cache entries of multiple Hierarchical Keyrings
and CachingCMMs will be appropriately separated.

## Out of Scope

- Supporting a shared Cache in the DB-ESDK to fetch
  BeaconKeyMaterials across multiple Searchable
  Encryption Configurations, or across multiple KMS Relationships.

## Motivation

The Hierarchical Keyring,
and it's component the (Branch) Key Store,
allow MPL Consumers to reduce their KMS Call volume
by persisting KMS protected cryptographic materials into
an available medium
(currently, only a DynamoDB table is available as persistence medium).

We call these cryptographic materials Branch Keys.

However, an instance of the Hierarchical Keyring
can only ever call KMS with one KMS Relationship,
which is, at least partly,
configured on the KMS Client determined
at the Hierarchical Keyring's construction.

By KMS Relationship, we mean any or all of the following:

- KMS Configuration
- Credentials used when creating the KMS Client, and thus
  used when calling KMS
- Other properties of the KMS Client, such as the region,
  or request headers

The Local Cryptographic Material Cache of
the Hierarchical Keyring instance is then only
populated with Branch Keys that correspond with
that KMS relationship.

Which is appropriate,
as it is clear under what KMS relationship
a Branch Key is accessed.

However,
the Hierarchical Keyring,
and it's Key Store,
have a runtime cost,
exerting memory pressure
and, without manual optimization,
requiring at least 2 TLS handshakes
when first serving a request
(TLS to KMS & TLS to DDB).

Additionally,
the local Cryptographic Materials Cache
exerts some runtime cost,
particularly in a multi-threaded environment,
when a background worker thread MAY be refreshing
or pruning entries of the cache.

For MPL Consumers that MUST work with Branch Keys
under different KMS Relationships,
this runtime cost adds up.

These MPL Consumers MAY end up establishing
an LRU Cache of Hierarchical Keyrings.
Which, while workable, is sub-optimal,
and clearly makes the Hierarchical Keyring,
in these conditions,
"Hard to Use".

The objective, with these changes,
is to make the Hierarchical Keyring
"Easy to Use" in a multiple KMS Relationship
environment.

## Security Implications

The main security implication of this change is the responsibility for
providing the Partition ID for the Hierarchical Keyring,
and the Logical Key Store Name of the Key Store for the
Hierarchical Keyring while using a `Shared` cache.

Users need to be careful while setting the Partition ID and
Logical Key Store Name because if there are two or more Hierarchical Keyrings with:

- Same Partition ID
- Same Logical Key Store Name of the Key Store for the Hierarchical Keyring
- Same Branch Key ID

then the Hierarchical Keyrings WILL share cache entries in the `Shared` Cache.

This means that the branch-key used and cached by one Hierarchical Keyring can be
used by the other Hierarchical Keyring (within a TTL), effectively by-passing
KMS Access Control. We recommend evaluating your threat model carefully, to
understand and accept / mitigate this risk. By default, each Hierarchical Keyring's
Partition ID is set to a v4 UUID, which is a random 16 byte representation of the UUID.
Unless the customer explicitly sets the Partition ID of two Hierarchical Keyrings to
be the same, Hierarchical Keyrings will NOT by-pass KMS Access Controls.

Following is another important security consideration. Suppose you create two Hierarchical Keyrings
with the same Partition ID. The two keyrings are backed by two different physical DynamoDB Key Stores
holding two different branch keys, but with the same Branch Key ID for both the Branch Keys.
Additionally, the two different physical DynamoDB Key Stores also have the same
Logical Key Store Name. In this case, there is a risk of accidental unwanted cache
collisions where truly distinct cryptographic materials can be stored under the
same Cache Identifier. This is a security risk and can lead to customers encrypting their data
with the wrong branch key, which they MAY NOT have access to.
This risk can be mitigated by following CryptoTool's guidance:
There MUST always be a one-one mapping of your DynamoDB Key Store and the Logical Key Store Name.
That is, you should NEVER have two DynamoDB Key Stores with the same Logical Key Store Name.

Users should make sure that they set all of Partition ID, Logical Key Store Name and Branch Key ID
to be the same for two Hierarchical Keyrings if and only if they want them to share cache entries.

## Operational Implications

This change will allow customers to share an already initialized cache across multiple
Hierarchical Keyrings to facilitate caching across Key Stores/KMS Clients/KMS Keys.

## Examples

As part of this change, we will add two examples, one each in ESDK .NET and ESDK Java
demonstrating the use of `Shared` cache across Hierarchical Keyrings.
