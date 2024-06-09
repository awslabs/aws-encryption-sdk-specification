[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Cache Across Hierarchy Keyrings

## Affected Features

This serves as a reference of all features that this change affects.

| Feature                                                                                 |
| --------------------------------------------------------------------------------------- |
| [Keystore](../../framework/branch-key-store.md)                                         |
| [AWS KMS Hierarchical Keyring](../../framework/aws-kms/aws-kms-hierarchical-keyring.md) |

## Affected Specifications

This serves as a reference of all specification documents that this change affects.

| Specification                                                                           |
| --------------------------------------------------------------------------------------- |
| [Keystore](../../framework/branch-key-store.md)                                         |
| [AWS KMS Hierarchical Keyring](../../framework/aws-kms/aws-kms-hierarchical-keyring.md) |

## Affected Implementations

| Language | Version Introduced | Version Removed | Implementation                                                                                                                                                                                                                                                                                      |
| -------- | ------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dafny    | 1.4.0              | n/a             | [AwsKmsHierarchicalKeyring.dfy](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/src/Keyrings/AwsKms/AwsKmsHierarchicalKeyring.dfy)                                                          |
| Java     | 1.4.0              | n/a             | [CreateAwsKmsHierarchicalKeyringInput.java](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/java/src/main/smithy-generated/software/amazon/cryptography/materialproviders/model/CreateAwsKmsHierarchicalKeyringInput.java) |
| .NET     | 1.4.0              | n/a             | [CreateAwsKmsHierarchicalKeyringInput.cs](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/net/Generated/AwsCryptographicMaterialProviders/CreateAwsKmsHierarchicalKeyringInput.cs)                                         |

## Definitions

An "MPL Consumer" is a library, service, or other application
that uses the AWS Cryptographic Material Providers Library (MPL)
to manage cryptographic materials.
An "MPL Consumer" MAY be using an AWS Crypto Tools product,
such as the AWS Encryption SDK or AWS Database Encryption SDK.

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

The Hierarchy Keyring,
and it's component the (Branch) Keystore,
allow MPL Consumers to reduce their KMS Call volume
by persiting KMS protected cryptographic materials into
an avabile medium
(currently, only a DynamoDB table is avabile as persitance medium).

We call these cryptographic materials Branch Keys.

However, an instance of the Hierarchy Keyring
can only ever call KMS with one KMS Relationship,
which is, at least partly,
configured on the KMS Client determined
at the Hierarchy Keyring's construction.

By KMS Relationship, we mean any or all of the following:

- KMS Configuration
- Credentials used when creating the KMS Client, and thus used when calling KMS
- Other properties of the KMS Client, such as the region, or request headers

The Local Cryptographic Material Cache of
the Hierarchy Keyring instance is then only
populated with Branch Keys that correspond with
that KMS relationship.

Which is appropriate,
as it is clear under what KMS relationship
a Branch Key is accessed.

However,
the Hierarchy Keyring,
and it's Keystore,
have a runtime cost,
exceting memory pressure
and, without manual optimization,
requiring at least 2 TLS handshakes
when first serving a request
(TLS to KMS & TLS to DDB).

Additionally,
the local Cryptographic Materials Cache
excerts some runtime cost,
particualry in a multi-threaded enviorment,
when a background worker thread MAY be refreshing
or pruning entries of the cache.

For MPL Consumers that MUST work with Branch Keys
under different KMS Relationships,
this runtime cost adds up.

These MPL Consumers MAY end up establishing
a LRU Cache of Hierarchy Keyrings.

Which, while workable, is sub-optimal,
and clearly makes the Hierarchy Keyring,
in these conditions,
"Hard to Use".

The objective, with these changes,
is to make the Hierarchy Keyring
"Easy to Use" in a multiple KMS Relationship
enviorment.

To facilitate Caching across Keystores/KMS Clients/KMS Keys,
we MUST break the Cryptographic Materials Cache (CMC)
out of the Hierarchy Keyring.

By allowing MPL Consumers to provide an already intialized CMC
to the Hierarchy Keyring at construction,
the CMC MAY cache Branch Keys protected by different
KMS Relationships.

This simplifies Mutliple KMS Relationship MPL Consumers,
as they do not need to stand up LRU Cache of Hierarchy Keyrings.

Instead, they may maintain one CMC.
They still create a Hierarchy Keyring instance per KMS Relationship,
and they MUST use the correct Keyring to retrieve material
from the Cache.

But they need not maintain many Keyrings;
only the common cache.

Cache misses will populate the cache via
the Hierarchy Keyring that requested the material.

Again, cache entries MUST ONLY be

## Out of Scope

TODO

## Motivation

TODO

### Hierarchy Keyring Caching

Currently, the Hierarchy Keyring creates its own cache.

To facilitate Caching performance across Keystores/KMS Clients/KMS Keys,
we could (optionally) break the Cache out of the Hierarchy Keyring.

The Hierarhcy Keyring would instead take a constructed a Cache as
an arguement during initialization.

When writing to the Cache,
the Hierarchy Keyring would include the Keystore's ID,
which, ideally, uniquely identifies its KMS relationship.

By KMS Relationship, we mean any or all of the following:

- KMS Configuration
- Credentials used when creating the KMS Client, and thus used when calling KMS
- Other properties of the KMS Client, such as the region, or request headers

The changes proposed (and comitted to) here
do not include such a Cache refactoring,
as that would not address the stated goal
of allowing one Keystore to work across multiple
KMS ARNs.

## Operational Implications

TODO

## Reference-level Explanation

TODO
