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

A label MUST contain 1 to 255 printable ASCII characters
and MUST NOT contain only whitespace.

### milliseconds

A milliseconds value is a non-negative long
that is a length of time in milliseconds.

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

- [EMF Metrics Worker](emf-metrics-worker.md)

Note: A user MAY create their own custom Metrics Worker.

## Interface

### Inputs

The inputs to the MetricsWorker are groups of related fields, referred to as:

- [AddTime Input](#addtime-input)
- [AddCount Input](#addcount-input)
- [AddProperty Input](#addproperty-input)
- [Flush Input](#flush-input)

#### AddTime Input

This is the input to the [AddTime](#addtime) behavior.

The add time input MUST include the following:

- A [label](#label)
- A [milliseconds](#milliseconds) value

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

#### Flush Input

This is the input to the [Flush](#flush) behavior.

The flush input MUST include the following:

- A [transactionId](#transactionid)

### Behaviors

The MetricsWorker Interface MUST support the following behaviors:

- [AddTime](#addtime)
- [AddCount](#addcount)
- [AddProperty](#addproperty)
- [Flush](#flush)
- [Shutdown](#shutdown)

#### AddTime

Used to record one time value for a metric name.
Each recorded value MUST be kept as a separate value, not summed,
so that statistics such as percentiles can be computed over them.

#### AddCount

Used to aggregate a sum from multiple count values with the same metric name.

#### AddProperty

Used to add context/metadata in the form of a key-value pair related to a Metrics reference.

#### Flush

Used to signal that no more measurements will be added for a transactionId.

#### Shutdown

Used to signal that the worker will receive no more calls,
so it can write any measurements it still holds.

## Proposed Smithy Model

```smithy
use aws.polymorph#extendable

@extendable
resource MetricsWorker {
  operations: [
    AddTime,
    AddCount,
    AddProperty,
    Flush,
    Shutdown
  ]
}

@range(min: 0)
long NonNegativeLong

// Operations for different metric types
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
structure AddTimeInput {
  @required
  label: String,
  @required
  milliseconds: NonNegativeLong,
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

operation Flush {
  input: FlushInput,
  output: AddOutput,
}

operation Shutdown {
  input: ShutdownInput,
  output: AddOutput,
}

structure FlushInput {
  @required
  transactionId: String
}

structure ShutdownInput {}

// Common output structure
structure AddOutput {}

@aws.polymorph#reference(resource: MetricsWorker)
structure MetricsWorkerReference {}
```
