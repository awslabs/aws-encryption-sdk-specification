[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Keystore

## Version

0.1.0

### Changelog

- 0.1.0
  - Initital record

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation |
| -------- | -------------------------------------- | ------------------------- | -------------- |

## Overview

A Keystore persists hierarchical data that allows customers to call AWS KMS less often.
The Keystore persists branch keys in DynamoDb that wrap multiple data keys.
This creates a hierarchy where a branch key wraps multiple data keys and facilitates caching.
These branch keys MUST only be generated using the [AWS KMS API GenerateDataKeyWithoutPlaintext](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKeyWithoutPlaintext.html).

This Keystore interface defines operations that any implementation of its specification must support and implement.

## Definitions

- [Branch Key(s)](../structures.md#branch-key): Data keys that are reused to derive unique data keys for envelope encryption.
  For security considerations on when to rotate the branch key, refer to [Appendix B](#appendix-b-security-considerations-for-branch-key-rotation).
- [Beacon Key(s)](https://github.com/awslabs/aws-dynamodb-encryption-dafny/blob/main/specification/searchable-encryption/beacons.md#beacons):
  A root key used to then derive different beacon keys per beacon.
- [UUID](https://www.ietf.org/rfc/rfc4122.txt): a universally unique identifier that can be represented as a byte sequence or a string.

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Initialization

The following inputs MAY be specified to create a KeyStore:

- [ID](#key-store-id)
- [AWS KMS Grant Tokens](#gran-tokens)
- [DynamoDb Client](#dynamodb-client)
- [KMS Client](#kms-client)

The following inputs MUST be specified to create a KeyStore:

- [Table Name](#table-name)
- [AWS KMS Configuration](#aws-kms-configuration)
- [Logical KeyStore Name](#logical-keystore-name)

### Key Store ID

The Identifier for this KeyStore.
If one is not supplied, then a [version 4 UUID](https://www.ietf.org/rfc/rfc4122.txt) MUST be used.

### AWS KMS Grant Tokens

A list of AWS KMS [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

### DynamoDb Client

The DynamoDb Client used to put and get keys from the backing DDB table.

If not provided, one will be created in the region of the supplied KMS Key ARN

### KMS Client

The KMS Client used when wrapping and unwrapping keys.

If not provided, one will be created in the region of the supplied KMS Key ARN

On initialization the KeyStore MUST append a user agent string to the AWS KMS SDK Client with the
value `aws-kms-hierarchy`.

### Table Name

The table name of the DynamoDb table that backs this Keystore.

### AWS KMS Configuration

A valid [AWS KMS Key ARN](./aws-kms/aws-kms-key-arn.md#a-valid-aws-kms-arn)
that wraps and unwraps keys stored in Amazon DynamoDB.

### Logical KeyStore Name

The logical name for the DynamoDB Key Store Table.
This value can match the Table Name
but does not need to.
This name is cryptographically bound to all data stored in this table.
In the case of a restore from backup
the [DynamoDB Table Name](#dynamodb-table-name) can change to a new name,
but this name must remain the same.

When mapping [DynamoDB Table Names](#dynamodb-table-name) to [logical table name](#logical-table-name)
there MUST be a one to one mapping between the two.
The purpose of the logical name is to simplify restore type operations,
not make it easier to confuse what data comes from what physical table.

## Operations

The Keystore MUST support the following operations:

- [GetKeyStoreInfo](#getKeyStoreInfo)
- [CreateKeyStore](#createkeystore)
- [CreateKey](#createkey)
- [VersionKey](#versionkey)
- [GetActiveBranchKey](#getactivebranchkey)
- [GetBranchKeyVersion](#getbranchkeyversion)
- [GetBeaconKey](#beacon-key)
- [BranchKeyStatusResolution](#branch-key-status-resolution)

### GetKeyStoreInfo

This operation MUST return the key store information in this key store configuration.

This MUST include:

- [key store id](#key-store-id)
- [key store name](#table-name)
- [logical key store name](#logical-keystore-name)
- [AWS KMS Grant Tokens](#aws-kms-grant-tokens)
- [AWS KMS Configuration](#aws-kms-configuration)

### CreateKeyStore

This operation MUST first calls the DDB::DescribeTable API with the configured `tableName`.

If the response is successful, this operation validates that the table has the expected
[KeySchema](#keyschema) and [GlobalSecondaryIndexes](#globalsecondary-indexes) as defined below.
If these values do not match, this operation MUST yield an error.

If the client responds with a `ResourceNotFoundException`,
then this operation MUST continue and
MUST call [AWS DDB CreateTable](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html)
with the following specifics:

- TableName is the configured tableName.
- [KeySchema](#keyschema) as defined below.
- [GlobalSecondary Indexes](#globalsecondary-indexes) as defined below

If the operation fails to create table, the operation MUST fail.

If the operation successfully creates a table, the operation MUST return the AWS DDB Table Arn
back to the caller.

#### KeySchema

The following KeySchema MUST be configured on the table:

| AttributeName | KeyType   | Type |
| ------------- | --------- | ---- |
| branch-key-id | Partition | S    |
| type          | Sort      | S    |

#### GlobalSecondary Indexes

The table MUST configure a single GlobalSecondaryIndex:

- Index Name: `Active-Keys`
  - We are able to ensure a 1:1 mapping of the GSI to the configured [table name](#table-name)
    because the GSI ARN contains the table name.
- Projection:
  - ProjectionType: ALL

With KeySchema:

KeySchema:

| AttributeName | KeyType   | Type |
| ------------- | --------- | ---- |
| branch-key-id | Partition | S    |
| status        | Sort      | S    |

### CreateKey

This operation MUST create both a [branch key](#branch-key) and a [beacon key](#beacon-key) according to
the [Branch Key and Beacon Key Creation](#branch-key-and-beacon-key-creation) section.

If creation of both keys is successful, this operation MUST call [Amazon DynamoDB API TransactWriteItems](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html).
The call to Amazon DynamoDB TransactWriteItems MUST use the configured Amazon DynamoDB Client to make the call.
The operation MUST call Amazon DynamoDB TransactWriteItems according to the [write key material](#writing-branch-key-and-beacon-key-to-key-store) section

If writing to the key store succeeds, the operation MUST return the branch-key-id that maps to both
the branch key and the beacon key.

Otherwise, this operation MUST yield an error.

#### Branch Key and Beacon Key Creation

To create a branch key, this operation must generate the following values:

- `branchKeyId`: a new guid. This guid MUST be [version 4 UUID](https://www.ietf.org/rfc/rfc4122.txt)
- `version`: a new guid. This guid MUST be [version 4 UUID](https://www.ietf.org/rfc/rfc4122.txt)
- `timestamp`: a timestamp for the current time. This MUST be in ISO8601 format in UTC, to microsecond precision (e.g. “YYYY-MM-DDTHH:mm:ss.ssssssZ“)

The operation MUST call [AWS KMS API GenerateDataKeyWithoutPlaintext](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKeyWithoutPlaintext.html).
The call to AWS KMS GenerateDataKeyWithoutPlaintext MUST use the configured AWS KMS client to make the call.
The operation MUST call AWS KMS GenerateDataKeyWithoutPlaintext with a request constructed as follows:

- `KeyId` MUST be the configured KMS Key ARN.
- `NumberOfBytes` MUST be 32.
- `EncryptionContext` MUST be the [encryption context for branch keys](#encryption-context).
- `GrantTokens` MUST be this keystore's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

If the call to AWS KMS GenerateDataKeyWithoutPlaintext succeeds, the operation MUST use the `ciphertextBlob` as the
wrapped Branch Key.

To create a beacon key, this operation will continue to use the `branchKeyId` and `timestamp` as the [Branch Key](#branch-key).

The operation MUST call [AWS KMS API GenerateDataKeyWithoutPlaintext](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKeyWithoutPlaintext.html).
The call to AWS KMS GenerateDataKeyWithoutPlaintext MUST use the configured AWS KMS client to make the call.
The operation MUST call AWS KMS GenerateDataKeyWithoutPlaintext with a request constructed as follows:

- `KeyId` MUST be the configured KMS Key ARN.
- `NumberOfBytes` MUST be 32.
- `EncryptionContext` MUST be the [encryption context for beacon keys](#encryption-context).
- `GrantTokens` MUST be this keysotre's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

If the call to AWS KMS GenerateDataKeyWithoutPlaintext succeeds, the operation MUST use the `ciphertextBlob` as the
wrapped Beacon Key.

#### Writing Branch Key and Beacon Key to Key Store

To add both a branch key and a beacon key to the key store the
operation MUST call [Amazon DynamoDB API TransactWriteItems](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html).
The call to Amazon DynamoDB TransactWriteItems MUST use the configured Amazon DynamoDB Client to make the call.
The operation MUST call Amazon DynamoDB TransactWriteItems with a request constructed as follows:

List of TransactWriteItem:

- PUT:
  - Item:
    - “branch-key-id” (S): `branchKeyId`,
    - “type“ (S): "version:" + `version`,
    - “status” (S): "ACTIVE",
    - “enc” (B): the `ciphertextBlob` from the branch key KMS operation
    - “create-time” (S): `timestamp`
    - "kms-arn" (S): configured `KMS Key ARN`
    - “hierarchy-version” (N): 1
  - TableName: the configured Table Name
- PUT:
  - Item:
    - “branch-key-id” (S): `branchKeyId`,
    - “type“ (S): "beacon:true",
    - “status” (S): "SEARCH",
    - “enc” (B): the `ciphertextBlob` from the above KMS operation
    - “create-time” (S): `timestamp`
    - "kms-arn" (S): configured `KMS Key ARN`
    - “hierarchy-version” (N): 1
  - TableName is the configured Table Name

TransactWriteItemRequest:

- TransactWriteItems: List of TransactWriteItem

If DDB TransactWriteItems is successful, this operation MUST return a successful response containing no additional data.
Otherwise, this operation MUST yield an error.

### VersionKey

On invocation, the caller:

- MUST supply a `branch-key-id`

This operation MUST get the active key at `branch-key-id` using the same process as [GetActiveBranchKey](#getactivebranchkey), including successfully unwrapping the key.

This operation MUST make a DDB::Query to get the branch key at `branchKeyId` with status `ACTIVE`

1. Use the global secondary index (GSI) `Active-Keys` to query the keystore to retrieve the active key that matches the `branch-key-id` supplied.
   1. If the client is unable to fetch an `ACTIVE` key, GetActiveBranchKey MUST fail.
   1. Performing a query on the [branch keystore](../branch-key-store.md#record-format) may return multiple entries.
      There MUST only be one `ACTIVE` key. If there is more than one `ACTIVE` key, the operation MUST fail.
      1. If there are multiple `ACTIVE` keys, the caller SHOULD call [branchKeyStatusResolution](#branch-key-status-resolution) to remove
         violating `ACTIVE` keys.

The AWS DDB response MUST contain the fields defined in the [branch keystore record format](../#record-format).
If the record does not contain the defined fields, this operation MUST fail.
If the `type` on the item is not prefixed by "version", this operation MUST fail.

The operation MUST ReEncrypt the branch key according to the [AWS KMS Branch Key ReEncryption](#aws-kms-branch-key-reencryption) section.

To create a new `ACTIVE` branch key under the supplied `branch-key-id` the operation MUST generate the following values:

- `version`: a new guid. This guid MUST be [version 4 UUID](https://www.ietf.org/rfc/rfc4122.txt)
- `timestamp`: a timestamp for the current time. This MUST be in ISO8601 format in UTC, to microsecond precision (e.g. “YYYY-MM-DDTHH:mm:ss.ssssssZ“)

The operation MUST call [AWS KMS API GenerateDataKeyWithoutPlaintext](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKeyWithoutPlaintext.html).
The call to AWS KMS GenerateDataKeyWithoutPlaintext MUST use the configured AWS KMS client to make the call.
The operation MUST call AWS KMS GenerateDataKeyWithoutPlaintext with a request constructed as follows:

- `KeyId` MUST be the configured KMS key identifier.
- `NumberOfBytes` MUST be the 32.
- `EncryptionContext` MUST be the [encryption context for branch keys](#encryption-context).
- `GrantTokens` MUST be this keysotre's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

If any of the AWS KMS operations fail, the operation MUST fail.

To add the new branch key and the updated branch key to the keystore, the
operation MUST call [Amazon DynamoDB API TransactWriteItems](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html).
The call to Amazon DynamoDB TransactWriteItems MUST use the configured Amazon DynamoDB Client to make the call.
The operation MUST call Amazon DynamoDB TransactWriteItems with a request constructed as follows:

List of TransactWriteItem:

- PUT:
  - Item:
    - “branch-key-id” (S): `branchKeyId`,
    - “type“ (S): "version:" + `old version`,
    - “status” (S): "DECRYPT_ONLY",
    - “enc” (B): the `ciphertextBlob` from the branch key re encryption KMS operation
    - “create-time” (S): `timestamp`
    - "kms-arn" (S): configured `KMS Key ARN`
    - “hierarchy-version” (N): 1
  - TableName: the configured Table Name
- PUT:
  - Item:
    - “branch-key-id” (S): `branchKeyId`,
    - “type“ (S): "version:" + `new version`,
    - “status” (S): "ACTIVE",
    - “enc” (B): the `ciphertextBlob` from the above GenerateDataKeyWithoutPlaintext KMS operation
    - “create-time” (S): `timestamp`
    - "kms-arn" (S): configured `KMS Key ARN`
    - “hierarchy-version” (N): 1
  - TableName is the configured Table Name

TransactWriteItemRequest:

- TransactWriteItems: List of TransactWriteItem

If DDB TransactWriteItems is successful, this operation MUST return a successful response containing no additional data.
Otherwise, this operation MUST yield an error.

### Branch Key Status Resolution

There SHOULD only ever be one `ACTIVE` branch key.

In the case where there is more than one `ACTIVE` branch key, the caller should be able to
get back to only one `ACTIVE` key.

Multiple `ACTIVE` branch keys are not allowed, and MUST be resolved to only having the latest `ACTIVE` branch key.

The operation MUST:

- Resolve which key to use using the `create-time` field, the latest time value should be used as the `ACTIVE` key.
  - If the `create-time` values between two active keys are the same, the operation MUST order by the `version` lexicographically, and resolve to
    the "highest" version
- The rest of the violating branch keys MUST be re-encrypted according to the
  [AWS KMS Branch Key ReEncryption](#aws-kms-branch-key-reencryption) section.

The operation MUST verify that there is only one `ACTIVE` branch key for the supplied `branch-key-id`.

### GetActiveBranchKey

On invocation, the caller:

- MUST supply a `branch-key-id`

To query this keystore, this operation MUST do the following:

1. Use the global secondary index (GSI) `Active-Keys` to query the keystore to retrieve the active key that matches the `branch-key-id` supplied.
   1. If the client is unable to fetch an `ACTIVE` key, GetActiveBranchKey MUST fail.
   1. Performing a query on the [branch keystore](../branch-key-store.md#record-format) may return multiple entries.
      There SHOULD only be one `ACTIVE` key. In the case where more than one key is labeled `ACTIVE`,
      the operation MUST resolve which key to use using the `create-time` field, the latest time value should be used as the `ACTIVE` key.
      - If the `create-time` values between two active keys are the same, the operation MUST order by the `version` lexicographically, and resolve to
        the "highest" version

The AWS DDB response MUST contain the fields defined in the [branch keystore record format](../#record-format).
If the record does not contain the defined fields, this operation MUST fail.
If the `type` on the item is not prefixed by "version", this operation MUST fail.

The operation MUST decrypt the branch key according to the [AWS KMS Branch Key Decryption](#aws-kms-branch-key-decryption) section.

If the branch key fails to decrypt, GetActiveBranchKey MUST fail.

If the decryption of the branch key succeeds, GetActiveBranchKey verifies:

- The `KeyId` field in the AWS KMS response MUST equal the configured AWS KMS Key ARN.

This operation MUST construct [branch key materials](./structures.md#branch-key-materials) from the decrypted branch key material
and the branch key version from the returned `type` field.

This operation MUST return the constructed [branch key materials](./structures.md#branch-key-materials).

### GetBranchKeyVersion

On invocation, the caller:

- MUST supply a `branch-key-id`
- MUST supply a `branchKeyVersion`
- MAY supply a list of grant tokens

To get a branch key from the keystore this operation MUST call AWS DDB `GetItem`
using the `branch-key-id` as the Partition Key and "version:" + `branchKeyVersion` value as the Sort Key.

The AWS DDB response MUST contain the fields defined in the [branch keystore record format](../branch-key-store.md#record-format).
If the record does not contain the defined fields, this operation MUST fail.

The operation MUST decrypt the branch key according to the [AWS KMS Branch Key Decryption](#aws-kms-branch-key-decryption) section.

If the branch key fails to decrypt, this operation MUST fail.

If the decryption of the branch key succeeds, this operation verifies:

- The `KeyId` field in the AWS KMS response MUST equal the configured AWS KMS Key ARN.

This operation MUST construct [branch key materials](./structures.md#branch-key-materials) from the decrypted branch key material
and the branch key version from the returned `type` field.

This operation MUST return the constructed [branch key materials](./structures.md#branch-key-materials).

### GetBeaconKey

On invocation, the caller:

- MUST supply a `branch-key-id`
- MUST supply a `branchKeyVersion`

To get a branch key from the keystore this operation MUST call AWS DDB `GetItem`
using the `branch-key-id` as the Partition Key and "beacon:true" value as the Sort Key.

The AWS DDB response MUST contain the fields defined in the [branch keystore record format](../branch-key-store.md#record-format).
If the record does not contain the defined fields, this operation MUST fail.
If the record does not contain "SEARCH" as the "status" field, this operation MUST fail.

The operation MUST decrypt the beacon key according to the [AWS KMS Branch Key Decryption](#aws-kms-branch-key-decryption) section.

If the beacon key fails to decrypt, this operation MUST fail.

If the decryption of the beacon key succeeds, this operation verifies:

- The `KeyId` field in the AWS KMS response MUST equal the configured AWS KMS Key ARN.

This operation MUST construct [beacon key materials](./structures.md#beacon-key-materials) from the decrypted branch key material
and the `branchKeyId` from the returned `branch-key-id` field.

This operation MUST return the constructed [beacon key materials](./structures.md#beacon-key-materials).

## Encryption Context

The call to [AWS KMS API GenerateDataKeyWithoutPlaintext](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKeyWithoutPlaintext.html),
MUST construct an encryption context with the following key/values:

- branch-key-id: the `branchKeyId`
- type: the `type`
- status: The string literal "ACTIVE" | "SEARCH" if generating a beacon key
- create-time: the `timestamp`
- logicalKeyStoreName: the configured [logical Key Store name](#logical-keystore-name) for this key store
- kms-arn: the configured `AWS KMS Key ARN` in the [AWS KMS Configuration](#aws-kms-configuration) for this key store
- hierarchy-version: The string literal "1"

Additionally the operations MUST add any additional fields found on the record.

## DECRYPT_ONLY Encryption Context

The operation MUST construct an encryption context with the following key/values:

- branch-key-id: the `branchKeyId`
- type: the `type`
- status: The string literal "DECRYPT_ONLY"
- create-time: the `timestamp`
- logicalKeyStoreName: the configured [logical Key Store name](#logical-keystore-name) for this key store
- kms-arn: the configured `AWS KMS Key ARN` in the [AWS KMS Configuration](#aws-kms-configuration) for this key store
- hierarchy-version: The string literal "1"

Additionally the operation MUST add any additional fields found on the record.

## AWS KMS Branch Key Decryption

The operation MUST use the configured `KMS SDK Client` to decrypt the value of the branch key field.
The operation MUST create a branch key [encryption context](../structures.md#encryption-context).

When calling [AWS KMS Decrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html), the key store operation MUST call with a request constructed as follows:

- `KeyId` MUST be the AWS KMS Key ARN configured in the key store operation.
- `CiphertextBlob` MUST be the `enc` AWS DDB response value.
- `EncryptionContext` MUST be the branch key encryption context map.
- `GrantTokens` MUST be this keysotre's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

## AWS KMS Branch Key ReEncryption

The operation MUST use the configured `KMS SDK Client` to decrypt the value of the branch key field.

The operation MUST create a branch key [encryption context](./structures.md#encryption-context)
from the branch AWS DDB query response according to [branch key encryption context](#encryption-context).

The operation MUST create a branch key [encryption context](./structures.md#encryption-context)
for DECRYPT_ONLY branch keys according to the [decrypt only branch key encryption context](#decrypt_only-encryption-context).

When calling [AWS KMS API ReEncrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_ReEncrypt.html), the key store operation MUST call with a request constructed as follows:

- `CiphertextBlob` MUST be the encrypted branch key value that is stored in AWS DDB.
- `DestinationKeyId` MUST be the AWS KMS Key ARN configured in the key store operation.
- `DestinationEncryptionContext` MUST be the DECRYPT_ONLY branch key encryption context created.
- `GrantTokens` MUST be this keysotre's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).
- `SourceEncryptionContext` MUST be the branch key encryption context.
- `SourceKeyId` MUST be the AWS KMS Key ARN configured in the key store operation.

## Record Format

A branch key record MUST include the following key-value pairs:

1. `branch-key-id` : Unique identifier for a branch key; represented as [AWS DDB String](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
1. `type` : the string literal "beacon:true" if this is a branch key. If this is a branch key, the concatenation "version" + `version`, where `version` is a version 4 [UUID](https://www.ietf.org/rfc/rfc4122.txt) of the Branch Key Version; represented as [AWS DDB String](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
1. `enc` : Encrypted branch key; represented as [AWS DDB Binary](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
1. `status` : Identifier for the lifecycle of the key. Possible values MAY include: `ACTIVE`, `DECRYPT_ONLY`. `SEARCH`
1. `kms-arn`: The AWS KMS Key ARN in the [AWS KMS Configuration](#aws-kms-configuration) used to generate the `enc` value.
1. `create-time`: Timestamp in ISO8601 format in UTC, to microsecond precision.
   Represented as [AWS DDB String](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
1. `hierarchy-version`: Version of the hierarchical keyring; represented as [AWS DDB Number](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
