[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Metrics Agent Interface

## Version

1.0.0

### Changelog

- 1.0.0

  - Initial record

## Implementations

| Library  | Version Introduced  | Implementation |
| -------- | ------------------- | -------------- |
| ESDK     | T.B.D               | [ESDK.smithy](https://github.com/aws/aws-encryption-sdk/blob/mainline/AwsEncryptionSDK/dafny/AwsEncryptionSdk/Model/esdk.smithy)|
| MPL      | T.B.D               | [material-provider.smithy](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/Model/material-provider.smithy)|
| DB-ESDK  | T.B.D               | [DynamoDbEncryption.smithy](https://github.com/aws/aws-database-encryption-sdk-dynamodb/blob/main/DynamoDbEncryption/dafny/DynamoDbEncryption/Model/DynamoDbEncryption.smithy)|

## Overview

The Metrics Agent defines defines operations that allow messages
to be published to a destination.
The Metrics Agent interface describes the interface that all 
Metrics Agents MUST implement.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Supported Metrics Agents

T.B.D

Note: A user MAY create their own custom Metrics Agent.

## Interface

### Inputs

The inputs to the MetricsAgent are groups of related fields, referred to as:

- [AddDate Input](adddate-input)
- [AddTime Input](#addtime-input)
- [AddCount Input](#addcount-input)
- [AddProperty Input](#addproperty-input)

#### AddDate Input

This is the input to the [AddDate](#adddate) behavior.

The add date input MUST include the following:

- A label
- A date

The add date input MAY include the following:

- A transactionId

#### AddTime Input

This is the input to the [AddTime](#addtime) behavior.

The add time input MUST include the following:

- A label
- A duration 

The add time input MAY include the following:

- A transactionId

#### AddCount Input

This is the input to the [AddCount](#addcount) behavior.

The add count input MUST include the following:

- A label
- A date 

The add count input MAY include the following:

- A transactionId

#### AddProperty Input

This is the input to the [AddProperty](#addproperty) behavior.

The add property input MUST include the following:

- A label
- A value

The add property input MAY include the following:

- a transactionId

### Behaviors

The MetricsAgent Interface MUST support the following behaviors:

- [AddDate](#adddate)
- [AddTime](#addtime)
- [AddCount](#addcount)
- [AddProperty](#addproperty)


#### AddDate


#### AddTime


#### AddCount


#### AddProperty
