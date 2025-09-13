[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Adding a Metrics Interface

***NOTE: This document will be used to gain alignment on
this interface should look like and how it could be integrated with
existing operations. This document will not seek to specify
a Metrics implementation or specify which metrics will be collected
from impacted APIs or configurations.***

## Affected APIs or Client Configurations

This serves as a reference of all APIs and Client Configurations that this change affects.
This list is not exhaustive. Any downstream consumer of any API or client configuration SHOULD
also be updated as part of this proposed changed.

| API/ Configuration                                                                      |
| --------------------------------------------------------------------------------------- |
| [Encrypt](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/client-apis/encrypt.md) |
| [Decrypt](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/client-apis/decrypt.md) |
| [GetEncryptionMaterials](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/cmm-interface.md#get-encryption-materials)|
| [DecryptionMaterials](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/cmm-interface.md#decrypt-materials)|
| [OnEncrypt](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/keyring-interface.md#onencrypt)|
| [OnDecrypt](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/keyring-interface.md#ondecrypt)|
| [DynamoDB Table Encryption Config](https://github.com/aws/aws-database-encryption-sdk-dynamodb/blob/main/specification/dynamodb-encryption-client/ddb-table-encryption-config.md)|

## Affected Libraries

| Library  | Version Introduced  | Implementation |
| -------- | ------------------- | -------------- |
| ESDK     | T.B.D               | [ESDK.smithy](https://github.com/aws/aws-encryption-sdk/blob/mainline/AwsEncryptionSDK/dafny/AwsEncryptionSdk/Model/esdk.smithy)|
| MPL      | T.B.D               | [material-provider.smithy](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/Model/material-provider.smithy)|
| DB-ESDK  | T.B.D               | [DynamoDbEncryption.smithy](https://github.com/aws/aws-database-encryption-sdk-dynamodb/blob/main/DynamoDbEncryption/dafny/DynamoDbEncryption/Model/DynamoDbEncryption.smithy)|

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

Existing users of Crypto Tools (CT) libraries do no have any insights as to
how the librar(y/ies) behave(s) in their application. 
This can lead to frustrating debugging sessions where users
are required to have explicit tests to assert they are using a particular feature
correctly, or if customers are using any of the KMS keyrings users have to have
AWS Cloudwatch open to verify their application is sending values users expect.
This can be seen as a best practice and users may find this a good exercise;
however, CT's libraries do not make debugging an easy task.

A feature which allows customers to get real-time telemetry of their application's 
integration with CT's libraries would be welcomed by users and will deliver on the
"easy to use and hard to misuse" tenet.

Introducing a new interface that defines the operations that must be
implemented in order to build a specification compliant MetricsAgent.

## Requirements

The interface should have three requirements.

1. MUST be simple.
1. MUST be extensible.

The following is documented to signify its importance
even though the interface is not able to make this guarantee.
Every implementation of the proposed interface must
ensure the following.

1. MUST NOT block the application's execution thread.

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


## Points of Integration


## Proposed Smithy Model
```smithy
use aws.polymorph#extendable

@extendable
resource MetricsLogger {
  operations: [
    AddDate, 
    AddTime, 
    AddCount, 
    AddProperty
  ]
}

// Operations for different metric types
operation AddDate {
  input: AddDateInput,
  output: AddOutput,
  errors: [MetricsPutError]
}

operation AddTime {
  input: AddTimeInput,
  output: AddOutput,
  errors: [MetricsPutError]
}

operation AddCount {
  input: AddCountInput,
  output: AddOutput,
  errors: [MetricsPutError]
}

operation AddProperty {
  input: AddPropertyInput,
  output: AddOutput,
  errors: [MetricsPutError]
}

// Input structures for each operation with flattened values
structure AddDateInput {
  @required
  label: String,
  @required
  date: Timestamp,
  transactionId: String
}

structure AddTimeInput {
  @required
  label: String,
  @required
  duration: Long,  // Duration in milliseconds
  transactionId: String
}

structure AddCountInput {
  @required
  label: String,
  @required
  count: Long,
  transactionId: String
}

structure AddPropertyInput {
  @required
  label: String,
  @required
  value: String,
  transactionId: String
}

// Common output structure
structure AddOutput {}

// Error structure
@error("client")
structure MetricsPutError {
  @required
  message: String
}

@aws.polymorph#reference(resource: MetricsLogger)
structure MetricsLoggerReference {}

```
