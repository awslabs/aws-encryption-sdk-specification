[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Branch Keystore KMS Configuration of Discovery

## Affected Features

This serves as a reference of all features that this change affects.

| Feature                                         |
| ----------------------------------------------- |
| [Keystore](../../framework/branch-key-store.md) |

## Affected Specifications

This serves as a reference of all specification documents that this change affects.

| Specification                                                                           |
| --------------------------------------------------------------------------------------- |
| [Keystore](../../framework/branch-key-store.md)                                         |
| [AWS KMS Hierarchical Keyring](../../framework/aws-kms/aws-kms-hierarchical-keyring.md) |

## Affected Implementations

| Language | Version Introduced | Version Removed | Implementation                                                                                                                                                                                                                   |
| -------- | ------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dafny    | 1.4.0              | n/a             | [AwsCryptographyKeyStoreOperations.dfy](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/dafny/AwsCryptographyKeyStore/src/AwsCryptographyKeyStoreOperations.dfy) |
| Java     | 1.4.0              | n/a             | [KeyStore.java](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/java/src/main/smithy-generated/software/amazon/cryptography/keystore/KeyStore.java)     |
| .NET     | 1.4.0              | n/a             | [KeyStore.cs](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/net/Generated/AwsCryptographyKeyStore/KeyStore.cs)                                        |

## Definitions

An "MPL Consumer" is a library, service, or other application
that uses the AWS Cryptographic Material Providers Library (MPL)
to manage cryptographic materials.
An "MPL Consumer" may or may not be using an AWS Crypto Tools product,
such as the AWS Encryption SDK or AWS Database Encryption SDK.

A "discovery Keystore" is a (Branch) Keystore with
a KMS Configuration of Discovery or Multi-Region Discovery (MRDiscovery).

A "static Keystore" is a (Branch) Keystore with
a KMS Configuration of KMS Key ARN.

A "strict Keystore" is a (Branch) Keystore with
a KMS Configuration of KMS Multi-Region Key ARN or KMS Key ARN.

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

Allow MPL Consumers to easily configure
a Hierarchical Keyring to use
the KMS Key ARNs already persisted to a Logical Keystore.

Additionally, ensure a KMS Alias is not permitted as a KMS Key ARN.

## Out of Scope

- Administrative/Mutating operations for a Keystore with a KMS Configuration of Discovery;
  these are `VersionKey` & `CreateKey`.
- Lifecycle operations for the Keystore
- Changes to the Hierarchy Keyring to improve Caching performance across multiple Keystores

## Motivation

The (Branch) Keystore and the AWS KMS Hierarchical Keyring
can be used to facilitate Client Side Encryption for
a Multi-tenant environment where each tenant has at least one
[Branch Key](../../framework/structures.md#branch-key-materials).
However, Tenants may want an MPL Consumer to protect
their data with a particular KMS Key that is NOT necessarily the same
as other tenants.

Such a Multi-KMS Keystore is, prior to this change, difficult to use
as a Keystore instance is restricted to one and only one KMS Key ARN.
Many MPL Consumers have developed a work around to this restriction
by constructing and then caching a Keystore per KMS Key ARN.
These MPL Consumers than stand up their own "request-to-Keystore-to-BranchKeyID" logic.
This workaround may require an additional lookup
compared to the normal "Encryption Context determines Branch Key ID"
path.

The goal then is to allow MPL Consumers to construct Keystore instances that
MAY use the KMS Key ARNs already persisted to a Logical Keystore.

Put another way,
usage of Branch Keys need only consider the Keystore's Logical Name
(and therefore, backing persistance medium, which is currently always a DynamoDB table)
and Branch Key ID.

Usage may not need the KMS ARN.

### KMS Alias

Because the Branch Key creation operation asserted the result
of KMS `ReEncrypt` matched the Keystore's configured KMS Key ARN,
a KMS Key Alias could never be used with a Keystore to successfully create a Branch Key.

However, the runtime exception thrown did not make it clear
why `CreateKey` failed.

Rather than correct the exception,
Keystore construction MUST fail if the KMS Configuration
is "strict"
(KMS Key ARN or KMS MRKey ARN)
and the provided ARN is an Alias.

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

For Keystore's usage by a AWS KMS Hierarchical Keyring,
a "discovery Keystore" is identical to
a "kmsKeyArn Keystore".

However, only a "strict Keystore" can Create
or Version (rotate) Branch Keys.

Thus, all MPL Consumers MAY or MAY NOT
adopt a "discovery Keystore" as best fits their needs.

## Reference-level Explanation

### Keystore [AWS KMS Configuration](../../framework/branch-key-store.md#aws-kms-configuration) Options

The following Options are introduced:

- Discovery
- MRDiscovery

Which compliment the already exsisting options:

- KMS Key ARN (Single Region Compatability)
- KMS MRKey ARN (Multi-Region Compatability)

API documentation MUST clarify the
behavioral difference between these 4 options.

If a KMS Key ARN is provided,
it MUST NOT be an Alias.

If the KMS Configuration is not Discovery or MRDiscovery,
the KMS Configuration MUST distinguish between single region ARN compatibility
(KMS Key ARN)
and MRK ARN compatibility
(KMS MRKey Arn).

A "strict" Keystore is a Keystore with a KMS Configuration of either:

- KMS Key ARN
- KMS MRKey ARN

A "static" Keystore is a Keystore with a KMS Configuration of KMS Key ARN.

Discovery takes no additional arguements.

MRDiscovery requires a Region arguement,
and Keystore contruction MUST FAIL if a Region is not provided.

### Keystore's [AWS Key Arn Compatibility](../../framework/branch-key-store.md#aws-key-arn-compatibility)

The following line is added at the end:
If the [AWS KMS Configuration](#aws-kms-configuration) is Discovery or MRDiscovery,
no comparison is ever made between ARNs.

### Keystore [DynamoDb Client](../../framework/branch-key-store.md#dynamodb-client)

If the AWS KMS Configuration is "strict",
and no DynamoDb Client is provided,
a new DynamoDb Client MUST be created
with the region of the supplied KMS ARN.

If the AWS KMS Configuration is MRDiscovery,
and no DynamoDb Client is provided,
a new DynamoDb Client MUST be created
with the region supplied in MRDiscovery.

If the AWS KMS Configuration is Discovery,
and no DynamoDb Client is provided,
a new DynamoDb Client MUST be created
with the default configuration.

### Keystore [KMS Client](../../framework/branch-key-store.md#kms-client)

If the AWS KMS Configuration is "strict",
and no KMS Client is provided,
a new KMS Client MUST be created
with the region of the supplied KMS ARN.

If the AWS KMS Configuration is MRDiscovery,
and no KMS Client is provided,
a new KMS Client MUST be created
with the region supplied in MRDiscovery.

If the AWS KMS Configuration is Discovery,
and no KMS Client is provided,
a new KMS Client MUST be created
with the default configuration.

### Keystore's [GetKeyStoreInfo](../../framework/branch-key-store.md#getkeystoreinfo)

MUST detail the KMS Configuration.

### Keystore's [CreateKey](../../framework/branch-key-store.md#createkey)

CreateKey MUST immediately fail if the KMS Configuration is NOT KMS Key ARN or KMS MRKey ARN ("strict").

### Keystore's [VersionKey](../../framework/branch-key-store.md#versionkey) MUST

VersionKey MUST immediately fail if the KMS Configuration is NOT KMS Key ARN or KMS MRKey ARN ("strict").

_The following paragraph has already been "logically" added to the Keystore specification as [AWS Key Arn Compatibility](../../framework/branch-key-store.md#aws-key-arn-compatibility)_.
After calling DynamoDB `GetItem` but before authenticating the Keystore item,
if the Keystore's KMS Configuration is `KMS Key ARN`,
the `kms-arn` field of DDB response item MUST equal
the Keystore's configured KMS Key ARN,
or the operation MUST fail.

### Keystore's [AWS KMS Branch Key Decryption](../../framework/branch-key-store.md#aws-kms-branch-key-decryption)

After calling DynamoDB `GetItem`:
If the Keystore's [AWS KMS Configuration](#aws-kms-configuration) is `KMS Key ARN` or `KMS MRKey ARN`,
the `kms-arn` field of the DDB response item MUST be
[compatible with](#aws-key-arn-compatibility) the configured `KMS ARN` in
the [AWS KMS Configuration](#aws-kms-configuration) for this keystore,
or the operation MUST fail.

If the Keystore's [AWS KMS Configuration](#aws-kms-configuration) is `Discovery` or `MRDiscovery`,
the `kms-arn` field of DDB response item MUST NOT be an Alias
or the operation MUST fail.

<!--  "For all Branch Keys created by any version of the MPL, an Alias for kms-arn is impossible." -->

When calling [AWS KMS Decrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html),
the keystore operation MUST call with a request constructed as follows:

- `KeyId` MUST be [compatible with](#aws-key-arn-compatibility) the configured `AWS KMS Key ARN` in the [AWS KMS Configuration](#aws-kms-configuration) for this keystore.
- `KeyId`, if the KMS Configuration is Discovery, MUST be the `kms-arn` attribute value of the AWS DDB response item.
  If the KMS Configuration is MRDiscovery, `KeyId` MUST be the `kms-arn` attribute value of the AWS DDB response item, with the region replaced by the configured region.
  Otherwise, it MUST BE the Keystore's `KMS ARN`.
- `CiphertextBlob` MUST be the `enc` attribute value on the AWS DDB response item
- `EncryptionContext` MUST be the [encryption context](#encryption-context) constructed above
- `GrantTokens` MUST be this keystore's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).
