[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Metrics Worker Interface

_NOTE: Still in draft but in a state to receive feedback on 9-15-2025_

## Version

1.0.0

### Changelog

- 1.0.0
  - Initial record

## Implementations

| Library | Version Introduced | Implementation                                                                                                                                                                                                     |
| ------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ESDK    | T.B.D              | [ESDK.smithy](https://github.com/aws/aws-encryption-sdk/blob/mainline/AwsEncryptionSDK/dafny/AwsEncryptionSdk/Model/esdk.smithy)                                                                                   |
| MPL     | T.B.D              | [material-provider.smithy](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/Model/material-provider.smithy) |
| DB-ESDK | T.B.D              | [DynamoDbEncryption.smithy](https://github.com/aws/aws-database-encryption-sdk-dynamodb/blob/main/DynamoDbEncryption/dafny/DynamoDbEncryption/Model/DynamoDbEncryption.smithy)                                     |

## Overview

The Metrics Worker defines defines operations that allow messages
to be published to a destination.
The Metrics Worker interface describes the interface that all
Metrics Workers MUST implement.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

### label

A label is a string that is used
as an attribute name to aggregate
measurements. A label can be used to
add a dimension to the Metrics Worker

### date

A date is a value in milliseconds since epoch.

### duration

A duration is an enum value union with valid
options being seconds, minutes, milliseconds,
or hours.

### count

A count is a long value

### value

A value is a string that is used to attach
context to a particular label.

### transactionId

A transactionId is a string that
is used to coalasce multiple metric requests
for a given client request.

## Supported Metrics Workers

Note: A user MAY create their own custom Metrics Worker.

## Interface

### Inputs

The inputs to the MetricsWorker are groups of related fields, referred to as:

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

The MetricsWorker Interface MUST support the following behaviors:

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

Used to add context/metadata in the form of a key-value pair related to a Metrics reference.

## Proposed Smithy Model

```smithy
use aws.polymorph#extendable

@extendable
resource MetricsWorker {
  operations: [
    AddDate,
    AddTime,
    AddCount,
    AddProperty
  ]
}

union Duration {
    seconds: PositiveLong
    minutes: PositiveLong
    milliseconds: PositiveLong
    hours: PositiveLong
}

// Operations for different metric types
operation AddDate {
  input: AddDateInput,
  output: AddOutput,
}

operation AddTime {
  input: AddTimeInput,
  output: AddOutput,
}

operation AddCount {
  input: AddCountInput,
  output: AddOutput,
}

operation AddProperty {
  input: AddPropertyInput,
  output: AddOutput,
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
  duration: Duration
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

@aws.polymorph#reference(resource: MetricsWorker)
structure MetricsWorkerReference {}
```
