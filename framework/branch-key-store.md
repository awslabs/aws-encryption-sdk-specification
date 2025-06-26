[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Keystore

## Version

0.7.0

### Changelog

- 0.7.1
  - Branch key creation only uses customer input
- 0.7.0
  - [Mitigate Update Race in the Branch Key Store](../changes/2025-01-16_key-store-mitigate-update-race/background.md)
- 0.6.0
  - Introduce configurable storage options
- 0.5.0
  - Introduce KMS Configuration of MRDiscovery
- 0.4.0
  - Introduce KMS Configuration of Discovery
- 0.3.0
  - Introduce MRK Compatibility via KMS Configuration
- 0.2.0
  - Update keystore structure and add encryption context option
- 0.1.0
  - Initial record

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation                                                                                                                                                                                                                   |
| -------- | -------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dafny    | 0.5.0                                  | 1.4.0                     | [AwsCryptographyKeyStoreOperations.dfy](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/dafny/AwsCryptographyKeyStore/src/AwsCryptographyKeyStoreOperations.dfy) |
| Java     | 0.5.0                                  | 1.4.0                     | [KeyStore.java](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/java/src/main/smithy-generated/software/amazon/cryptography/keystore/KeyStore.java)     |
| .NET     | 0.5.0                                  | 1.4.0                     | [KeyStore.cs](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/net/Generated/AwsCryptographyKeyStore/KeyStore.cs)                                        |

## Overview

A Keystore persists hierarchical data that allows customers to call AWS KMS less often.
The Keystore persists branch keys that wrap multiple data keys.
This creates a hierarchy where a branch key wraps multiple data keys and facilitates caching.
These branch keys are only generated using the [AWS KMS API GenerateDataKeyWithoutPlaintext](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKeyWithoutPlaintext.html) in Hierarchy Version `v1` or [AWS KMS API GenerateDataKey](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html) in Hierarchy Version `v2`.

By creating and persisting a data key to an accessible medium,
such as a DynamoDb table,
distributed cryptographic agents can use common, coordinated, cryptographic materials.

This prevents distributed cryptographic agents from independently
generating unique data keys that COULD BE coordinated,
which leads to poor caching performance at decryption,
as each unique encrypting agent had a unique data key.

This Keystore interface defines operations that any implementation of its specification must support and implement.

## Definitions

- [Branch Key(s)](../structures.md#branch-key): Data keys that are reused to wrap unique data keys for envelope encryption.
  For security considerations on when to rotate the branch key, refer to [Appendix B](aws-kms/aws-kms-hierarchical-keyring.md#appendix-b-security-considerations-for-branch-key-rotation).
- [Beacon Key(s)](https://github.com/awslabs/aws-database-encryption-sdk-dynamodb-java/blob/main/specification/searchable-encryption/beacons.md#beacons):
  A root key used to then derive different beacon keys per beacon.
- [UUID](https://www.ietf.org/rfc/rfc4122.txt): a universally unique identifier that can be represented as a byte sequence or a string.

#### Hierarchy Version

Schema Version of the Branch Key.
All items of the same Branch Key Identifier SHOULD have the same hierarchy-version.
The hierarchy-version determines how the Branch Key Store protects and validates the branch key with KMS.

There are two hierarchy versions:

- v1
- v2

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Initialization

The following inputs MAY be specified to create a KeyStore:

- [ID](#keystore-id)
- [AWS KMS Grant Tokens](#aws-kms-grant-tokens)
- [Storage](#storage)
- [DynamoDb Client](#dynamodb-client)
- [Table Name](#table-name)
- [KMS Client](#kms-client)
- [KeyManagement](#keymanagement)

The following inputs MUST be specified to create a KeyStore:

- [AWS KMS Configuration](#aws-kms-configuration)
- [Logical KeyStore Name](#logical-keystore-name)

If neither [Storage](#storage) nor [Table Name](#table-name) is configured initialization MUST fail.
If both [Storage](#storage) and [Table Name](#table-name) are configured initialization MUST fail.
If both [Storage](#storage) and [DynamoDb Client](#dynamodb-client) are configured initialization MUST fail.
If both [KeyManagement](#keymanagement) and [KMS Client](#kms-client) are configured initialization MUST fail.
If both [KeyManagement](#keymanagement) and [Grant Tokens](#aws-kms-grant-tokens) are configured initialization MUST fail.

If [Storage](#storage) is configured with [KeyStorage](#keystorage)
then this MUST be the configured [KeyStorage interface](./key-store/key-storage.md#interface).

If [Storage](#storage) is not configured with [KeyStorage](#keystorage)
a [default key storage](./key-store/default-key-storage.md#initialization) MUST be created.

This constructed [default key storage](./key-store/default-key-storage.md#overview)
MUST be configured with the provided [logical keystore name](#logical-keystore-name).

This constructed [default key storage](./key-store/default-key-storage.md#initialization)
MUST be configured with either the [Table Name](#table-name) or the [DynamoDBTable](#dynamodbtable) table name
depending on which one is configured.

This constructed [default key storage](./key-store/default-key-storage.md#initialization)
MUST be configured with either the [DynamoDb Client](#dynamodb-client), the DDB client in the [DynamoDBTable](#dynamodbtable)
or a constructed DDB client depending on what is configured.

If a DDB client needs to be constructed and the AWS KMS Configuration is KMS Key ARN or KMS MRKey ARN,
a new DynamoDb client MUST be created with the region of the supplied KMS ARN.

If a DDB client needs to be constructed and the AWS KMS Configuration is Discovery,
a new DynamoDb client MUST be created with the default configuration.

If a DDB client needs to be constructed and the AWS KMS Configuration is MRDiscovery,
a new DynamoDb client MUST be created with the region configured in the MRDiscovery.

If no AWS KMS client is provided one MUST be constructed.

If AWS KMS client needs to be constructed and the AWS KMS Configuration is KMS Key ARN or KMS MRKey ARN,
a new AWS KMS client MUST be created with the region of the supplied KMS ARN.

If AWS KMS client needs to be constructed and the AWS KMS Configuration is Discovery,
a new AWS KMS client MUST be created with the default configuration.

If AWS KMS client needs to be constructed and the AWS KMS Configuration is MRDiscovery,
a new AWS KMS client MUST be created with the region configured in the MRDiscovery.

On initialization the KeyStore SHOULD
append a user agent string to the AWS KMS SDK Client with
the value `aws-kms-hierarchy`.

### Keystore ID

The Identifier for this KeyStore.
If one is not supplied, then a [version 4 UUID](https://www.ietf.org/rfc/rfc4122.txt) MUST be used.

### AWS KMS Grant Tokens

A list of AWS KMS [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

### DynamoDb Client

The DynamoDb Client used to put and get keys from the backing DDB table.
This options is deprecated in favor of [storage](#storage)

### KMS Client

The KMS Client used when wrapping and unwrapping keys.
This options is deprecated in favor of [KeyManagement](#keymanagement)

### Table Name

The table name of the DynamoDb table that backs this Keystore.
This options is deprecated in favor of [storage](#storage)

### AWS KMS Configuration

This configures the Keystore's KMS Key ARN restrictions,
which determines which KMS Key(s) is used
to wrap and unwrap the keys stored in Amazon DynamoDB.
There are four (4) options:

- Discovery
- MRDiscovery
- Single Region Key Compatibility, denoted as `KMS Key ARN`
- Multi Region Key Compatibility, denoted as `KMS MRKey ARN`

`KMS Key ARN` and `KMS MRKey ARN` MUST take an additional argument
that is a KMS ARN.
This ARN MUST NOT be an Alias.
This ARN MUST be a valid
[AWS KMS Key ARN](./aws-kms/aws-kms-key-arn.md#a-valid-aws-kms-arn).

Both `KMS Key ARN` and `KMS MRKey ARN` accept MRK or regular Single Region KMS ARNs.

To be clear, an KMS ARN for a Multi-Region Key MAY be provided to the `KMS Key ARN` configuration,
and a KMS ARN for non Multi-Region Key MAY be provided to the `KMS MRKey ARN` configuration.

`Discovery` does not take an additional argument.

`MRDiscovery` MUST take an additional argument, which is a region.
Any MRK ARN discovered will be changed to this region before use.

### Storage

This configures how the Keystore will get encrypted data.
There are two valid storage options:

- DynamoDBTable
- KeyStorage

#### DynamoDBTable

A DynamoDBTable configuration MUST take the DynamoDB table name.
A DynamoDBTable configuration MAY take [DynamoDb Client](#dynamodb-client).

#### KeyStorage

A [KeyStorage interface](./key-store/key-storage.md#interface)

### KeyManagement

This configures how the Keystore will authenticate encrypted data
or create new branch keys.
There is one valid storage option:

- AwsKms

#### AwsKms

An AwsKms configuration MAY take a list of AWS KMS [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).
An AwsKms configuration MAY take an [AWS KMS SDK client](#awskms).

#### AWS Key ARN Compatibility

For two ARNs to be compatible:

If the [AWS KMS Configuration](#aws-kms-configuration) designates single region ARN compatibility,
then two ARNs are compatible if they are exactly equal.

If the [AWS KMS Configuration](#aws-kms-configuration) designates MRK ARN compatibility,
then two ARNs are compatible if they are equal in all parts other than the region.
That is, they are compatible if [AWS KMS MRK Match for Decrypt](aws-kms/aws-kms-mrk-match-for-decrypt.md#implementation) returns true.

If the [AWS KMS Configuration](#aws-kms-configuration) is Discovery or MRDiscovery,
no comparison is ever made between ARNs.

#### Discovery

Discovery takes no additional information.

The Keystore MAY use the KMS Key ARNs already
persisted to the backing DynamoDB table,
provided they are in records created
with an identical Logical Keystore Name.

The `VersionKey` and `CreateKey` Operations are NOT supported
and will fail with a runtime exception.

There is no Multi-Region logic with this configuration;
if a Multi-Region Key is encountered,
and the region in the ARN is not the region of the KMS Client,
requests will fail with KMS Exceptions.

#### MRDiscovery

MRDiscovery takes an additional argument, which is a region.
Any MRK ARN discovered will be changed to this region before use.

The Keystore MAY use the KMS Key ARNs already
persisted to the backing DynamoDB table,
provided they are in records created
with an identical Logical Keystore Name.

The `VersionKey` and `CreateKey` Operations are NOT supported
and will fail with a runtime exception.

### Logical KeyStore Name

This name is cryptographically bound to all data stored in this table,
and logically separates data between different tables.

The logical keystore name MUST be bound to every created key.

There needs to be a one to one mapping between DynamoDB Table Names and the Logical KeyStore Name.
This value can be set to the DynamoDB table name itself, but does not need to.

Controlling this value independently enables restoring from DDB table backups
even when the table name after restoration is not exactly the same.

## Operations

The Keystore MUST support the following operations:

- [GetKeyStoreInfo](#getkeystoreinfo)
- [CreateKeyStore](#createkeystore)
- [CreateKey](#createkey)
- [VersionKey](#versionkey)
- [GetActiveBranchKey](#getactivebranchkey)
- [GetBranchKeyVersion](#getbranchkeyversion)
- [GetBeaconKey](#getbeaconkey)

### GetKeyStoreInfo

This operation MUST return the keystore information in this keystore configuration.

This MUST include:

- [keystore id](#keystore-id)
- [keystore name](#table-name)
- [logical Keystore name](#logical-keystore-name)
- [AWS KMS Grant Tokens](#aws-kms-grant-tokens)
- [AWS KMS Configuration](#aws-kms-configuration)

The [keystore name](#table-name) MUST be obtained
from the configured [KeyStorage](./key-store/key-storage.md#interface)
by calling [GetKeyStorageInfo](./key-store/key-storage.md#getkeystorageinfo).

### CreateKeyStore

If a [table Name](#table-name) was not configured then CreateKeyStore MUST fail.

This operation MUST first calls the DDB::DescribeTable API with the configured `tableName`.

If the response is successful, this operation validates that the table has the expected
[KeySchema](#keyschema) as defined below.
If the [KeySchema](#keyschema) does not match
this operation MUST yield an error.
The table MAY have additional information,
like GlobalSecondaryIndex defined.

If the client responds with a `ResourceNotFoundException`,
then this operation MUST continue and
MUST call [AWS DDB CreateTable](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html)
with the following specifics:

- TableName is the configured tableName.
- [KeySchema](#keyschema) as defined below.

If the operation fails to create table, the operation MUST fail.

If the operation successfully creates a table, the operation MUST return the AWS DDB Table Arn
back to the caller.

#### KeySchema

The following KeySchema MUST be configured on the table:

| AttributeName | KeyType   | Type |
| ------------- | --------- | ---- |
| branch-key-id | Partition | S    |
| type          | Sort      | S    |

### CreateKey

The CreateKey caller MUST provide:

- An optional branch key id
- An optional encryption context
- An optional Hierarchy-Version

If an optional branch key id is provided
and no encryption context is provided this operation MUST fail.

If the Keystore's KMS Configuration is `Discovery` or `MRDiscovery`,
this operation MUST fail.

If no branch key id is provided,
then this operation MUST create a [version 4 UUID](https://www.ietf.org/rfc/rfc4122.txt)
to be used as the branch key id.

If no Hierarchy-Version is provided,
then this operation MUST use `v1`.

This operation needs to generate the following:

- `version`: a new guid. This guid MUST be [version 4 UUID](https://www.ietf.org/rfc/rfc4122.txt)
- `timestamp`: a timestamp for the current time.
  This timestamp MUST be in ISO 8601 format in UTC, to microsecond precision (e.g. “YYYY-MM-DDTHH:mm:ss.ssssssZ“)

This operation MUST create a [branch key](structures.md#branch-key) and a [beacon key](structures.md#beacon-key) according to
the [Branch Key and Beacon Key Creation](#branch-key-and-beacon-key-creation) section.

If creation of the keys are successful,
the operation MUST call Amazon DynamoDB TransactWriteItems according to the [write key material](#writing-branch-key-and-beacon-key-to-keystore) section.

If writing to the keystore succeeds,
the operation MUST return the branch-key-id that maps to both
the branch key and the beacon key.

Otherwise, this operation MUST yield an error.

#### Branch Key and Beacon Key Creation

To create a branch key, this operation MUST take the following:

- `branchKeyId`: The identifier
- `encryptionContext`: Additional encryption context to bind to the created keys
- `kms-arn`: The KMS-ARN determined by the KMS Configuration
- `hierarchy-version`: The hierarchy-version determined by the input
- `version`: a new guid. This guid MUST be [version 4 UUID](https://www.ietf.org/rfc/rfc4122.txt)
- `timestamp`: a timestamp for the current time.
  This timestamp MUST be in ISO 8601 format in UTC, to microsecond precision (e.g. “YYYY-MM-DDTHH:mm:ss.ssssssZ“)

The wrapped Branch Key Items, DECRYPT_ONLY and ACTIVE, MUST be created according to [Wrapped Branch Key Creation](#wrapped-branch-key-creation).

If the `hierarchy-version` is `v1`,
the wrapped beacon key MUST be created according to [Wrapped Beacon Key Creation `v1`](#wrapped-beacon-key-creation-v1) and
the wrapped branch keys MUST be created according to
[Wrapped Branch Key Creation `v1`](#wrapped-branch-key-creation-v1);
else the `hierarchy-version` MUST be `v2`,
the wrapped beacon Key MUST be created according to [Wrapped Beacon Key Creation `v2`](#wrapped-beacon-key-creation-v2) and
the wrapped branch keys MUST be created according to
[Wrapped Branch Key Creation `v2`](#wrapped-branch-key-creation-v2).

##### Wrapped Beacon Key Creation `v1`

To create a beacon key, this operation will continue to use the `branchKeyId` and `timestamp` as the [Branch Key](structures.md#branch-key).

The operation MUST call [AWS KMS API GenerateDataKeyWithoutPlaintext](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKeyWithoutPlaintext.html).
The call to AWS KMS GenerateDataKeyWithoutPlaintext MUST use the configured AWS KMS client to make the call.
The operation MUST call AWS KMS GenerateDataKeyWithoutPlaintext with a request constructed as follows:

- `KeyId` MUST be the configured `AWS KMS Key ARN` in the [AWS KMS Configuration](#aws-kms-configuration) for this keystore.
- `NumberOfBytes` MUST be 32.
- `EncryptionContext` MUST be the [encryption context for beacon keys](#beacon-key-encryption-context).
- `GrantTokens` MUST be this keystore's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

If the call to AWS KMS GenerateDataKeyWithoutPlaintext succeeds,
the operation MUST use the `CiphertextBlob` as the wrapped Beacon Key.

##### Wrapped Beacon Key Creation `v2`

The operation MUST create a map of strings,
the [branch key context for beacon keys](#beacon-key-branch-key-context).

The operation MUST calculate the **SHA-384 Digest for the beacon key**
by [serializing](../structures.md#serialization) the [branch key context for beacon keys](#beacon-key-branch-key-context);
the serialization MUST be done according to the [encryption context serialization specification](../structures.md#serialization).

The operation MUST call [AWS KMS API GenerateDataKey](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html).
The call to AWS KMS GenerateDataKey MUST use the configured AWS KMS client to make the call.
The operation MUST call AWS KMS GenerateDataKey with a request constructed as follows:

- `KeyId` MUST be the `kms-arn`
- `NumberOfBytes` MUST be 32.
- `EncryptionContext` MUST be the `encryption-context`
- `GrantTokens` MUST be this keystore's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

If the call to AWS KMS GenerateDataKey succeeds,
the operation MUST use the `Plaintext` from GenerateDataKey result 
as the plain-text Beacon Key.

The operation MUST concatenate the **SHA-384 Digest for the beacon key**
with the plain-text Beacon Key,
creating the **beacon plain-text tuple**.

The operation MUST call [AWS KMS API Encrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html)
with a request constructed as follows:

- `Plaintext` **beacon plain-text tuple**
- `KeyId` MUST be the `kms-arn`.
- `GrantTokens` MUST be this keystore's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).
- `EncryptionContext` MUST be the `encryption-context`

If the call to AWS KMS Encrypt succeeds,
the operation MUST use the Encrypt result `CiphertextBlob`
as the wrapped Beacon Key.

#### Wrapped Branch Key Creation

Given a `branchKeyId`, `version`, `timestamp`, `kms-arn`, `encryption-context`, and `hierarchy-version`.

##### Wrapped Branch Key Creation `v1`

The operation MUST generate a map of strings,
the [DECRYPT_ONLY encryption context for branch keys](#decrypt_only-encryption-context),
using the `branchKeyId`, `version`, `timestamp`, `kms-arn`, `encryption-context`, and `hierarchy-version`.

The operation MUST generate a map of strings,
the [ACTIVE encryption context for branch keys](#active-encryption-context)
using the `branchKeyId`, `version`, `timestamp`, `kms-arn`, `encryption-context`, and `hierarchy-version`.

The operation MUST call [AWS KMS API GenerateDataKeyWithoutPlaintext](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKeyWithoutPlaintext.html).
The call to AWS KMS GenerateDataKeyWithoutPlaintext MUST use the configured AWS KMS client to make the call.
The operation MUST call AWS KMS GenerateDataKeyWithoutPlaintext with a request constructed as follows:

- `KeyId` MUST be the configured `AWS KMS Key ARN` in the [AWS KMS Configuration](#aws-kms-configuration) for this keystore.
- `NumberOfBytes` MUST be 32.
- `EncryptionContext` MUST be the [DECRYPT_ONLY encryption context for branch keys](#decrypt_only-encryption-context).
- `GrantTokens` MUST be this keystore's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

If the call to AWS KMS GenerateDataKeyWithoutPlaintext succeeds,
the operation MUST use the GenerateDataKeyWithoutPlaintext result `CiphertextBlob`
as the wrapped DECRYPT_ONLY Branch Key.

The operation MUST call [AWS KMS API ReEncrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_ReEncrypt.html)
with a request constructed as follows:

- `SourceEncryptionContext` MUST be the [DECRYPT_ONLY encryption context for branch keys](#decrypt_only-encryption-context).
- `SourceKeyId` MUST be the `kms-arn`.
- `CiphertextBlob` MUST be the wrapped DECRYPT_ONLY Branch Key.
- `GrantTokens` MUST be this keystore's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).
- `DestinationKeyId` MUST be the `kms-arn`.
- `DestinationEncryptionContext` MUST be the [ACTIVE encryption context for branch keys](#active-encryption-context).

If the call to AWS KMS ReEncrypt succeeds,
the operation MUST use the ReEncrypt result `CiphertextBlob`
as the wrapped ACTIVE Branch Key.

##### Wrapped Branch Key Creation `v2`

The operation MUST generate a map of strings,
the [`DECRYPT_ONLY` branch key context for branch keys](#decrypt_only-branch-key-context).

The operation MUST calculate the **SHA-384 Digest for the `DECRYPT_ONLY`**
by [serializing](../structures.md#serialization) the [`DECRYPT_ONLY` branch key context for branch keys](#decrypt_only-branch-key-context);
the serialization MUST be done according to the [encryption context serialization specification](../structures.md#serialization).

The operation MUST generate a map of strings,
the [ACTIVE branch key context for branch keys](#active-branch-key-context).

The operation MUST calculate the **SHA-384 Digest for the `ACTIVE`**
by [serializing](../structures.md#serialization) the [`ACTIVE` branch key context for branch keys](#active-branch-key-context);
the serialization MUST be done according to the [encryption context serialization specification](../structures.md#serialization).

The operation MUST call [AWS KMS API GenerateDataKey](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html).
The call to AWS KMS GenerateDataKey MUST use the configured AWS KMS client to make the call.
The operation MUST call AWS KMS GenerateDataKey with a request constructed as follows:

- `KeyId` MUST be the `kms-arn`
- `NumberOfBytes` MUST be 32.
- `EncryptionContext` MUST be the `encryption-context`
- `GrantTokens` MUST be this keystore's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

If the call to AWS KMS GenerateDataKey succeeds,
the operation MUST use the `Plaintext` from GenerateDataKey result 
as the plain-text Branch Key.

The operation MUST concatenate the **SHA-384 Digest for the `DECRYPT_ONLY`**
with the plain-text Branch Key,
creating the **`DECRYPT_ONLY` plain-text tuple**.

The operation MUST call [AWS KMS API Encrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_ReEncrypt.html)
with a request constructed as follows:

- `Plaintext` **the `DECRYPT_ONLY` plain-text tuple**
- `KeyId` MUST be the `kms-arn`.
- `GrantTokens` MUST be this keystore's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).
- `EncryptionContext` MUST be the `encryption-context`

If the call to AWS KMS Encrypt succeeds,
the operation MUST use the Encrypt result `CiphertextBlob`
as the wrapped `DECRYPT_ONLY` Branch Key.

The operation MUST concatenate the **SHA-384 Digest for the `ACTIVE`**
with the plain-text Branch Key,
creating the **the `ACTIVE` plain-text tuple**.

The operation MUST call [AWS KMS API Encrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html)
with a request constructed as follows:

- `Plaintext` **the `ACTIVE` plain-text tuple**
- `KeyId` MUST be the `kms-arn`.
- `GrantTokens` MUST be this keystore's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).
- `EncryptionContext` MUST be the `encryption-context`

If the call to AWS KMS Encrypt succeeds,
the operation MUST use the Encrypt result `CiphertextBlob`
as the wrapped `ACTIVE` Branch Key.

#### Writing Branch Key and Beacon Key to Keystore

To add the branch keys and a beacon key to the keystore the
operation MUST call [Amazon DynamoDB API TransactWriteItems](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html).

The call to Amazon DynamoDB TransactWriteItems MUST use the configured Amazon DynamoDB Client to make the call.
The operation MUST call Amazon DynamoDB TransactWriteItems with a request constructed as follows:

List of TransactWriteItem:

- PUT:
  - Item:
    - “branch-key-id” (S): `branchKeyId`,
    - “type“ (S): "branch:version:" + `version`,
    - “enc” (B): the wrapped DECRYPT_ONLY Branch Key `CiphertextBlob` from the KMS operation
    - “create-time” (S): `timestamp`
    - "kms-arn" (S): configured KMS Key
    - “hierarchy-version” (N): either `1` or `2`, depending on the `hierarchy-version`
    - Every key-value pair of the custom [encryption context](./structures.md#encryption-context-3) that is associated with the branch key
      MUST be added with an Attribute Name of `aws-crypto-ec:` + the Key and Attribute Value (S) of the value.
  - ConditionExpression: `attribute_not_exists(branch-key-id)`
  - TableName: the configured Table Name
- PUT:
  - Item:
    - “branch-key-id” (S): `branchKeyId`,
    - “type“ (S): "branch:ACTIVE",
    - “enc” (B): wrapped ACTIVE Branch Key `CiphertextBlob` from the KMS operation
    - “create-time” (S): `timestamp`
    - "kms-arn" (S): configured KMS Key
    - “hierarchy-version” (N): either `1` or `2`, depending on the `hierarchy-version`
    - Every key-value pair of the custom [encryption context](./structures.md#encryption-context-3) that is associated with the branch key
      MUST be added with an Attribute Name of `aws-crypto-ec:` + the Key and Attribute Value (S) of the value.
  - ConditionExpression: `attribute_not_exists(branch-key-id)`
  - TableName: the configured Table Name
- PUT:
  - Item:
    - “branch-key-id” (S): `branchKeyId`,
    - “type“ (S): "beacon:ACTIVE",
    - “enc” (B): the wrapped Beacon Key `CiphertextBlob` from the KMS operation
    - “create-time” (S): `timestamp`
    - "kms-arn" (S): configured KMS Key
    - “hierarchy-version” (N): either `1` or `2`, depending on the `hierarchy-version`
    - Every key-value pair of the custom [encryption context](./structures.md#encryption-context-3) that is associated with the branch key
      MUST be added with an Attribute Name of `aws-crypto-ec:` + the Key and Attribute Value (S) of the value.
  - ConditionExpression: `attribute_not_exists(branch-key-id)`
  - TableName is the configured Table Name

TransactWriteItemRequest:

- TransactWriteItems: List of TransactWriteItem

If DDB TransactWriteItems is successful, this operation MUST return a successful response containing no additional data.
Otherwise, this operation MUST yield an error.

### VersionKey

On invocation, the caller:

- MUST supply a `branch-key-id`

If the Keystore's KMS Configuration is `Discovery` or `MRDiscovery`,
this operation MUST immediately fail.

VersionKey MUST first get the active version for the branch key from the keystore
by calling AWS DDB `GetItem`
using the `branch-key-id` as the Partition Key and `"branch:ACTIVE"` value as the Sort Key.

The `kms-arn` field of DDB response item MUST be [compatible with](#aws-key-arn-compatibility)
the configured `KMS ARN` in the [AWS KMS Configuration](#aws-kms-configuration) for this keystore.

The `kms-arn` stored in the DDB table MUST NOT change as a result of this operation,
even if the KeyStore is configured with a `KMS MRKey ARN` that does not exactly match the stored ARN.
If such were allowed, clients using non-MRK KeyStores might suddenly stop working.

The values on the AWS DDB response item
MUST be authenticated according to [authenticating a keystore item for item with hierarchy version v1](#authenticating-a-branch-keystore-item-for-item-with-hierarchy-version-v1) or [authenticating a keystore item for item with hierarchy version v2](#authenticating-a-branch-keystore-item-for-item-with-hierarchy-version-v2) based on schema version of the branch key item.
If the item fails to authenticate this operation MUST fail.

The wrapped Branch Keys, DECRYPT_ONLY and ACTIVE, MUST be created according to [Wrapped Branch Key Creation](#wrapped-branch-key-creation).

To add the new branch key to the keystore,
the operation MUST call [Amazon DynamoDB API TransactWriteItems](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html).
The call to Amazon DynamoDB TransactWriteItems MUST use the configured Amazon DynamoDB Client to make the call.
The operation MUST call Amazon DynamoDB TransactWriteItems with a request constructed as follows:

List of TransactWriteItem:

- PUT:
  - Item:
    - “branch-key-id” (S): `branchKeyId`,
    - “type“ (S): "branch:version:" + `version`,
    - “enc” (B): the wrapped DECRYPT_ONLY Branch Key `CiphertextBlob` from the KMS operation
    - “create-time” (S): `timestamp`
    - "kms-arn" (S): configured KMS Key
    - “hierarchy-version” (N): 1
    - Every key-value pair of the custom [encryption context](./structures.md#encryption-context-3) that is associated with the branch key
      MUST be added with an Attribute Name of `aws-crypto-ec:` + the Key and Attribute Value (S) of the value.
  - ConditionExpression: `attribute_not_exists(branch-key-id)`
  - TableName: the configured Table Name
- PUT:
  - Item:
    - “branch-key-id” (S): `branchKeyId`,
    - “type“ (S): "branch:ACTIVE",
    - “enc” (B): wrapped ACTIVE Branch Key `CiphertextBlob` from the KMS operation
    - “create-time” (S): `timestamp`
    - "kms-arn" (S): configured KMS Key
    - “hierarchy-version” (N): 1
    - Every key-value pair of the custom [encryption context](./structures.md#encryption-context-3) that is associated with the branch key
      MUST be added with an Attribute Name of `aws-crypto-ec:` + the Key and Attribute Value (S) of the value.
  - ConditionExpression: `attribute_exists(branch-key-id) AND enc = :encOld`
  - ExpressionAttributeValues: `{":encOld" := DDB.AttributeValue.B(oldCiphertextBlob)}`
  - TableName: the configured Table Name

TransactWriteItemRequest:

- TransactWriteItems: List of TransactWriteItem

If DDB TransactWriteItems is successful, this operation MUST return a successful response containing no additional data.
Otherwise, this operation MUST yield an error.

The condition expression for the Active Input ensures
the Active Item in storage has not changed since it was read.
This prevents overwrites due to a race in updating the Active Item.

#### Authenticating a Branch Keystore item for item with `hierarchy-version` v1

The operation MUST use the configured `KMS SDK Client` to authenticate the value of the keystore item.

Every attribute on the AWS DDB response item except `enc` attribute MUST be authenticated.

Every key in the constructed [encryption context](#encryption-context)
except `tableName`
MUST exist as a string attribute in the AWS DDB response item.
Every value in the constructed [encryption context](#encryption-context)
except the logical table name
MUST equal the value with the same key in the AWS DDB response item.
The key `enc` MUST NOT exist in the constructed [encryption context](#encryption-context).

The operation MUST call [AWS KMS API ReEncrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_ReEncrypt.html)
with a request constructed as follows:

- `SourceEncryptionContext` MUST be the [encryption context](#encryption-context) constructed above
- `SourceKeyId` MUST be [compatible with](#aws-key-arn-compatibility) the configured KMS Key in the [AWS KMS Configuration](#aws-kms-configuration) for this keystore.
- `CiphertextBlob` MUST be the `enc` attribute value on the AWS DDB response item
- `GrantTokens` MUST be the configured [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).
- `DestinationKeyId` MUST be [compatible with](#aws-key-arn-compatibility) the configured KMS Key in the [AWS KMS Configuration](#aws-kms-configuration) for this keystore.
- `DestinationEncryptionContext` MUST be the [encryption context](#encryption-context) constructed above

#### Authenticating a Branch Keystore item for item with `hierarchy-version` v2

The operation MUST use the configured `KMS SDK Client` to authenticate the value of the keystore item.

Every attribute on the AWS DDB response item expect `enc` MUST be authenticated.
From the AWS DDB response item, the operation MUST create a [branch key context](#branch-key-context) and [encryption context](#encryption-context).

The operation MUST follow [AWS KMS Branch Key Decryption](#aws-kms-branch-key-decryption) to decrypt and authentication the branch key context.

### GetActiveBranchKey

On invocation, the caller:

- MUST supply a `branch-key-id`

To get the active version for the branch key id from the keystore
this operation MUST call AWS DDB `GetItem`
using the `branch-key-id` as the Partition Key and `"branch:ACTIVE"` value as the Sort Key.

The AWS DDB response MUST contain the fields defined in the [branch keystore record format](#record-format).
If the record does not contain the defined fields, this operation MUST fail.

The operation MUST decrypt the branch key according to the [AWS KMS Branch Key Decryption](#aws-kms-branch-key-decryption) section.

If the branch key fails to decrypt, GetActiveBranchKey MUST fail.

This GetActiveBranchKey MUST construct [branch key materials](./structures.md#branch-key-materials)
according to [Branch Key Materials From Authenticated Encryption Context](#branch-key-materials-from-authenticated-encryption-context).

This operation MUST return the constructed [branch key materials](./structures.md#branch-key-materials).

### GetBranchKeyVersion

- MUST supply a `branch-key-id`
- MUST supply a `branchKeyVersion`

To get a branch key from the keystore this operation MUST call AWS DDB `GetItem`
using the `branch-key-id` as the Partition Key and "branch:version:" + `branchKeyVersion` value as the Sort Key.

The AWS DDB response MUST contain the fields defined in the [branch keystore record format](#record-format).
If the record does not contain the defined fields, this operation MUST fail.

The operation MUST decrypt the branch key according to the [AWS KMS Branch Key Decryption](#aws-kms-branch-key-decryption) section.

If the branch key fails to decrypt, this operation MUST fail.

This GetBranchKeyVersion MUST construct [branch key materials](./structures.md#branch-key-materials)
according to [Branch Key Materials From Authenticated Encryption Context](#branch-key-materials-from-authenticated-encryption-context).

This operation MUST return the constructed [branch key materials](./structures.md#branch-key-materials).

### GetBeaconKey

On invocation, the caller:

- MUST supply a `branch-key-id`

To get a branch key from the keystore this operation MUST call AWS DDB `GetItem`
using the `branch-key-id` as the Partition Key and "beacon:ACTIVE" value as the Sort Key.

The AWS DDB response MUST contain the fields defined in the [branch keystore record format](#record-format).
If the record does not contain the defined fields, this operation MUST fail.

The operation MUST decrypt the beacon key according to the [AWS KMS Branch Key Decryption](#aws-kms-branch-key-decryption) section.

If the beacon key fails to decrypt, this operation MUST fail.

This GetBeaconKey MUST construct [beacon key materials](./structures.md#beacon-key-materials) from the decrypted branch key material
and the `branchKeyId` from the returned `branch-key-id` field.

This operation MUST return the constructed [beacon key materials](./structures.md#beacon-key-materials).

## Branch Key Context

Branch Key Context is a key value pair that can contain additional contextual information about the data. 
This section describes how Branch Key Context is built from an [encrypted hierarchical key](./key-store/key-storage.md#encryptedhierarchicalkey).

The following branch key context keys are shared:

- MUST have a `branch-key-id` attribute
- The `branch-key-id` field MUST not be an empty string
- MUST have a `type` attribute
- The `type` field MUST not be an empty string
- MUST have a `create-time` attribute
- MUST have a `tablename` attribute to store the logicalKeyStoreName
- MUST have a `kms-arn` attribute
- MUST have a `hierarchy-version`
- MUST NOT have a `enc` attribute

### ACTIVE Branch Key Context

The ACTIVE branch key is a copy of the DECRYPT_ONLY with the same `version`.
It is structured slightly differently so that the active version can be accessed quickly.

In addition to the [branch key context](#encryption-context):

The ACTIVE branch key context value of the `type` attribute MUST equal to `"branch:ACTIVE"`.
The ACTIVE branch key context MUST have a `version` attribute.
The `version` attribute MUST store the branch key version formatted like `"branch:version:"` + `version`.

### DECRYPT_ONLY Branch Key Context

In addition to the [branch key context](#branch-key-context):

The DECRYPT_ONLY branch key context MUST NOT have a `version` attribute.
The `type` attribute MUST stores the branch key version formatted like `"branch:version:"` + `version`.

### Beacon Key Branch Key Context

In addition to the [branch key context](#encryption-context):

The Beacon key branch key context value of the `type` attribute MUST equal to `"beacon:ACTIVE"`.
The Beacon key branch key context MUST NOT have a `version` attribute.

## Encryption Context

This section describes how the AWS KMS encryption context is built.

If the `hierarchy-version` is v1, AWS KMS encryption context MUST be same as [branch key context](#branch-key-context).
If the `hierarchy-version` is v2, AWS KMS encryption context MUST be the [encryption context](../structures.md#encryption-context) send by users without any transformation.

AWS KMS encryption context MUST be always the same encryption context send by user regardless of any variation of encryption context (i.e.: ACTIVE Encryption Context, DECRYPT_ONLY Encryption Context, Beacon Key Encryption Context and Custom Encryption Context).

### ACTIVE Encryption Context

If the `hierarchy-version` is v1, ACTIVE Encryption Context is same as [ACTIVE Branch Key Context](#active-branch-key-context)

### DECRYPT_ONLY Encryption Context

If the `hierarchy-version` is v1, DECRYPT_ONLY Encryption Context is same as [DECRYPT_ONLY Branch Key Context](#decrypt_only-branch-key-context)

### Beacon Key Encryption Context

If the `hierarchy-version` is v1, Beacon Encryption Context is same as [Beacon Key Branch Key Context](#beacon-key-branch-key-context)

### Custom Encryption Context

If custom [encryption context](./structures.md#encryption-context)
is associated with the branch key these values MUST be added to the AWS KMS encryption context.
To avoid name collisions each added attribute from the custom [encryption context](./structures.md#encryption-context-3)
MUST be prefixed with `aws-crypto-ec:`.
Across all versions of a Branch Key, the custom encryption context MUST be equal.

## AWS KMS Branch Key Decryption

The operation MUST use the configured `KMS SDK Client` to decrypt the value of the branch key field.

If the Keystore's [AWS KMS Configuration](#aws-kms-configuration) is `KMS Key ARN` or `KMS MRKey ARN`,
the `kms-arn` field of the DDB response item MUST be
[compatible with](#aws-key-arn-compatibility) the configured KMS Key in
the [AWS KMS Configuration](#aws-kms-configuration) for this keystore,
or the operation MUST fail.

If the Keystore's [AWS KMS Configuration](#aws-kms-configuration) is `Discovery` or `MRDiscovery`,
the `kms-arn` field of DDB response item MUST NOT be an Alias
or the operation MUST fail.

<!--  "For all Branch Keys created by any version of the MPL, an Alias for kms-arn is impossible." -->

When calling [AWS KMS Decrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html),
the keystore operation MUST call with a request constructed as follows:

- `KeyId`, if the KMS Configuration is Discovery, MUST be the `kms-arn` attribute value of the AWS DDB response item.
  If the KMS Configuration is MRDiscovery, `KeyId` MUST be the `kms-arn` attribute value of the AWS DDB response item, with the region replaced by the configured region.
  Otherwise, it MUST BE the Keystore's configured KMS Key.
- `CiphertextBlob` MUST be the enc attribute value on the AWS DDB response item
- `EncryptionContext` MUST be the [encryption context](#encryption-context) constructed above
- `GrantTokens` MUST be this keystore's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

Every attribute except for `enc` on the AWS DDB response item
MUST be authenticated in the decryption of `enc`. 
In Hierarchy Version `v1`, when AWS KMS Decrypt succeeds this attribute gets 
authenticated by KMS as they are included in the AWS KMS encryption context. 
For authentication of these attributes in Hierarchy Version `v2`, 
the operation MUST match the first 48 bytes of `Plaintext` returned by AWS KMS Decrypt operation with SHA-384 Digest for the beacon key of serialization of the [branch key context](#branch-key-context).

## Record Format

A branch key record MUST include the following key-value pairs:

1. `branch-key-id` : Unique identifier for a branch key; represented as [AWS DDB String](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
1. `type` : One of the following; represented as [AWS DDB String](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
   - The string literal `"beacon:ACTIVE"`. Then `enc` is the wrapped beacon key.
   - The string `"branch:version:"` + `version`, where `version` is the Branch Key Version. Then `enc` is the wrapped branch key.
   - The string literal `"branch:ACTIVE"`. Then `enc` is the wrapped beacon key of the active version. Then
1. `version` : Only exists if `type` is the string literal `"branch:ACTIVE"`.
   Then it is the Branch Key Version. represented as [AWS DDB String](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
1. `enc` : Encrypted version of the key;
   represented as [AWS DDB Binary](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
1. `kms-arn`: The AWS KMS Key ARN used to generate the `enc` value.
   represented as [AWS DDB String](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
1. `create-time`: Timestamp in ISO 8601 format in UTC, to microsecond precision.
   Represented as [AWS DDB String](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
1. `hierarchy-version`: Version of the hierarchical keyring;
   represented as [AWS DDB Number](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)

A branch key record MAY include [custom encryption context](#custom-encryption-context) key-value pairs.
These attributes MUST be always prefixed with `aws-crypto-ec:` regardless of the item's `hierarchy-version`.

### Branch Key Materials From Authenticated Encryption Context

The `type` attribute MUST either be equal to `"branch:ACTIVE"` or start with `"branch:version:"`.

If the `type` attribute is equal to `"branch:ACTIVE"`
then the authenticated encryption context MUST have a `version` attribute
and the version string is this value.
If the `type` attribute start with `"branch:version:"` then the version string MUST be equal to this value.

To construct [branch key materials](./structures.md#branch-key-materials) from authenticated encryption context as follows:

- [Branch Key](./structures.md#branch-key) MUST be the [decrypted branch key material](#aws-kms-branch-key-decryption)
- [Branch Key Id](./structures.md#branch-key-id) MUST be the `branch-key-id`
- [Branch Key Version](./structures.md#branch-key-version)
  The version string MUST start with `branch:version:`.
  The remaining string encoded as UTF8 bytes MUST be the Branch Key version.
- [Encryption Context](./structures.md#encryption-context-3) MUST be constructed by
  [Custom Encryption Context From Authenticated Encryption Context](#custom-encryption-context-from-authenticated-encryption-context)

### Custom Encryption Context From Authenticated Encryption Context

The custom encryption context is stored as map of UTF8 Encoded bytes.

For every key in the [encryption context](./structures.md#encryption-context-3)
the string `aws-crypto-ec:` + the UTF8 decode of this key
MUST exist as a key in the authenticated encryption context.
Also, the value in the [encryption context](./structures.md#encryption-context-3) for this key
MUST equal the value in the authenticated encryption context
for the constructed key.

### Example

Given the simplified [branch key material](./structures.md#branch-key-materials) structure

```dafny
BranchKeyMaterials(
  branchKey := [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  branchKeyId := "bbb9baf1-03e6-4716-a586-6bf29995314b",
  branchKeyVersion := "83eec007-5659-4554-bf11-699b90f41ac6",
  encryptionContext := [ "department" := "admin"]
)
```

There would be three items in the keystore table.
The DECRYPT_ONLY version, the ACTIVE version, and a beacon key.

The DECRYPT_ONLY simplified JavaScript JSON format would look like this

```json
{
  "branch-key-id": "bbb9baf1-03e6-4716-a586-6bf29995314b",
  "type": "branch:version:83eec007-5659-4554-bf11-699b90f41ac6",
  "enc": "NnYwxJ/oiQCLnqRh/IcrCR2mmOnO4SAVLw2pspKJKd6rpa0H8z/4hGpGxcWozdb7VByebDFWb0VTWxaOUA8=",
  "kms-arn": "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
  "create-time": "2023-06-03T19:03:29.358Z",
  "hierarchy-version": "1",
  "aws-crypto-ec:department": "admin"
}
```

The ACTIVE simplified JavaScript JSON format would look like this

```json
{
  "branch-key-id" : "bbb9baf1-03e6-4716-a586-6bf29995314b",
  "type" : ""branch:ACTIVE",
  "version": "branch:version:83eec007-5659-4554-bf11-699b90f41ac6"
  "enc" : "BiXHTm0j27+jsgJZ7yCnvI6yvjFyStMsHiC8fnR9KzKjwwhi0gB+5CZTfXFC2ufmBtCYX/sLvKsFnEITR+k=",
  "kms-arn" : "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
  "create-time" : "2023-06-03T19:03:29.358Z",
  "hierarchy-version" : "1",
  "aws-crypto-ec:department" : "admin",
}
```

The BEACON simplified JavaScript JSON format would look like this

```json
{
  "branch-key-id": "bbb9baf1-03e6-4716-a586-6bf29995314b",
  "type": "beacon:ACTIVE",
  "enc": "hgb2RyDQinOCpzKWdi17E+t9WB9pRExQXpD/20bsu9hxr38HjQvGvihoYpL6sKuF0Ek+37B1UE9tK3SIOiE=",
  "kms-arn": "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
  "create-time": "2023-06-03T19:03:29.358Z",
  "hierarchy-version": "1",
  "aws-crypto-ec:department": "admin"
}
```
