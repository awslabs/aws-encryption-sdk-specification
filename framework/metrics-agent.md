[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Metrics Agent Interface

*NOTE: Still in draft but in a state to receive feedback on 9-15-2025*

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

### label

A label is a string that is used
as a an attribute name to aggregate
measurements. A label can be used to
add a dimension to the Metrics Agent

### date

A date is a value in milliseconds since epoch.

### duration

A duration is a value in milliseconds

### count

A count is an Long value

### value

A value is a string that is used to attach
context to a particular label.

### transactionId

A transactionId is a string that
is used to coalasce multiple metric requests
for a given client request.


## Supported Metrics Agents

Note: A user MAY create their own custom Metrics Agent.

## Interface

### Inputs

The inputs to the MetricsAgent are groups of related fields, referred to as:

- [AddDate Input](#adddate-input)
- [AddTime Input](#addtime-input)
- [AddCount Input](#addcount-input)
- [AddProperty Input](#addproperty-input)

#### AddDate Input

This is the input to the [AddDate](#adddate) behavior.

The add date input MUST include the following:

- A [label](#label)
- A [date](#date)

The add date input MAY include the following:

- A [transactionId](#transactionid)

#### AddTime Input

This is the input to the [AddTime](#addtime) behavior.

The add time input MUST include the following:

- A [label](#label)
- A [duration](#duration)

The add time input MAY include the following:

- A [transactionId](#transactionid)

#### AddCount Input

This is the input to the [AddCount](#addcount) behavior.

The add count input MUST include the following:

- A [label](#label)
- A [count](#count)

The add count input MAY include the following:

- A [transactionId](#transactionid)

#### AddProperty Input

This is the input to the [AddProperty](#addproperty) behavior.

The add property input MUST include the following:

- A [label](#label)
- A [value](#value)

The add property input MAY include the following:

- A [transactionId](#transactionid)

### Behaviors

The MetricsAgent Interface MUST support the following behaviors:

- [AddDate](#adddate)
- [AddTime](#addtime)
- [AddCount](#addcount)
- [AddProperty](#addproperty)

#### AddDate
Used to record a specific time value with the same metric name.

#### AddTime
Used to aggregate a sum from multiple time values with the same metric name.

#### AddCount
Used to aggregate a sum from multiple count values with the same metric name.

#### AddProperty
Used to add context/metadata in the form of a key-value pair related to a Metrics instance

## Proposed Smithy Model
```smithy
use aws.polymorph#extendable

@extendable
resource MetricsAgent {
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

@aws.polymorph#reference(resource: MetricsAgent)
structure MetricsAgentReference {}

```