[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Dynamodb Key Storage

## Version

0.2.0

### Changelog

- 0.2.0
  - [Mitigate Update Race in the Branch Key Store](../../changes/2025-01-16_key-store-mitigate-update-race/background.md)
- 0.1.0
  - Initial record

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation |
| -------- | -------------------------------------- | ------------------------- | -------------- |

## Overview

The Dynamodb Key Storage is the default implementation of the [key storage interface](./key-storage.md#overview)
used by the [key store](../branch-key-store.md#overview).
It is backed by DynamoDB and can be used as a reference for customers implementing their own interface.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Initialization

The following inputs MUST be specified to create a Dynamodb Key Storage Interface:

- [DynamoDb Client](#dynamodb-client)
- [Table Name](#table-name)
- [Logical KeyStore Name](#logical-keystore-name)

### DynamoDb Client

The DynamoDb Client used to put and get keys from the backing DDB table.

### Table Name

The table name of the DynamoDb table that backs this Keystore.

### Logical KeyStore Name

This name is cryptographically bound to all data stored in this table,
and logically separates data between different tables.

It is not stored on the items in the so it MUST be added
to items retrieved from the table.

## Operations

The Dynamodb Key Storage Interface MUST implement the [key storage interface](./key-storage.md#interface).

### WriteNewEncryptedBranchKey

To add the branch keys and a beacon key to the keystore the
operation MUST call [Amazon DynamoDB API TransactWriteItems](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html).
The call to Amazon DynamoDB TransactWriteItems MUST use the configured Amazon DynamoDB Client to make the call.
The operation MUST call Amazon DynamoDB TransactWriteItems with a request constructed as follows:

List of TransactWriteItem:

- PUT:
  - Item: A [record formatted item](#record-format) constructed from the version input
  - ConditionExpression: `attribute_not_exists(branch-key-id)`
  - TableName: the configured Table Name
- PUT:
  - Item: A [record formatted item](#record-format) constructed from the active input
  - ConditionExpression: `attribute_not_exists(branch-key-id)`
  - TableName: the configured Table Name
- PUT:
  - Item: A [record formatted item](#record-format) constructed from the beacon input
  - ConditionExpression: `attribute_not_exists(branch-key-id)`
  - TableName is the configured Table Name

TransactWriteItemRequest:

- TransactWriteItems: List of TransactWriteItem

If DDB TransactWriteItems is successful, this operation MUST return a successful response containing no additional data.
Otherwise, this operation MUST yield an error.

### WriteNewEncryptedBranchKeyVersion

To add the new branch key to the keystore,
the operation MUST call [Amazon DynamoDB API TransactWriteItems](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html).
The call to Amazon DynamoDB TransactWriteItems MUST use the configured Amazon DynamoDB Client to make the call.
The operation MUST call Amazon DynamoDB TransactWriteItems with a request constructed as follows:

List of TransactWriteItem:

- PUT:
  - Item: A [record formatted item](#record-format) constructed from the version input
  - ConditionExpression: `attribute_not_exists(branch-key-id)`
  - TableName: the configured Table Name
- PUT:
  - Item: A [record formatted item](#record-format) constructed from the active input
  - ConditionExpression: `attribute_exists(branch-key-id) AND enc = :encOld`
  - ExpressionAttributeValues: `{":encOld" := DDB.AttributeValue.B(oldCiphertextBlob)}`
  - TableName: the configured Table Name

TransactWriteItemRequest:

- TransactWriteItems: List of TransactWriteItem

The condition expression for the Active Input ensures
the Active Item in storage has not changed since it was read.
This prevents overwrites due to a race in updating the Active Item.

If the Write fails because of the Active Item's condition expression,
the Storage Layer SHOULD throw a Version Race Exception.

### GetEncryptedActiveBranchKey

To get the active version for the branch key id from the keystore
this operation MUST call AWS DDB `GetItem`
using the `branch-key-id` as the Partition Key and `"branch:ACTIVE"` value as the Sort Key.

The AWS DDB response MUST contain the fields defined in the [branch keystore record format](#record-format).
The returned EncryptedHierarchicalKey MUST have the same identifier as the input.
The returned EncryptedHierarchicalKey MUST have a type of ActiveHierarchicalSymmetricVersion.
If the record does not contain the defined fields, this operation MUST fail.

### GetEncryptedBranchKeyVersion

To get a branch key from the keystore this operation MUST call AWS DDB `GetItem`
using the `branch-key-id` as the Partition Key and "branch:version:" + `branchKeyVersion` value as the Sort Key.

The AWS DDB response MUST contain the fields defined in the [branch keystore record format](#record-format).
The returned EncryptedHierarchicalKey MUST have the same identifier as the input.
The returned EncryptedHierarchicalKey MUST have the same version as the input.
The returned EncryptedHierarchicalKey MUST have a type of HierarchicalSymmetricVersion.
If the record does not contain the defined fields, this operation MUST fail.

### GetEncryptedBeaconKey

To get a branch key from the keystore this operation MUST call AWS DDB `GetItem`
using the `branch-key-id` as the Partition Key and "beacon:ACTIVE" value as the Sort Key.

The AWS DDB response MUST contain the fields defined in the [branch keystore record format](#record-format).
The returned EncryptedHierarchicalKey MUST have the same identifier as the input.
The returned EncryptedHierarchicalKey MUST have a type of ActiveHierarchicalSymmetricBeacon.
If the record does not contain the defined fields, this operation MUST fail.

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

A branch key record MAY include [custom encryption context](../branch-key-store.md#custom-encryption-context) key-value pairs.
These attributes should be prefixed with `aws-crypto-ec:` the same way they are for [AWS KMS encryption context](../branch-key-store.md#encryption-context).
