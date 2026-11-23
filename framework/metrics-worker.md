[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Metrics Worker Interface

## Version

1.0.0

### Changelog

- 1.0.0
  - Initial record

## Overview

Metrics Workers are responsible for publishing observability data to a destination.

The Metrics Worker interface specified in this document describes the interface all Metrics Workers MUST implement.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

### label

An input value to a Metrics Worker
that is used as an attribute name to aggregate measurements.
A label can be used to add a dimension to the Metrics Worker.

The label MUST be a string value.

A label MUST contain 1 to 255 printable ASCII characters
and MUST NOT contain only whitespace.

### milliseconds

An input value to a Metrics Worker
that is a length of time in milliseconds.

The milliseconds value MUST be a non-negative, finite double value.
It MAY have a fractional part, so that a time shorter than one millisecond is not recorded as 0.

### count

An input value to a Metrics Worker
that is a number of occurrences of an event.

The count MUST be a long value.

### value

An input value to a Metrics Worker
that attaches context to a particular label.

The value MUST be a string value.

### transactionId

An input value to a Metrics Worker
that is used to coalesce multiple metric requests
for a given client request.

The transactionId MUST be a string value.

## Supported Metrics Workers

- [EMF Metrics Worker](emf-metrics-worker.md)

Note: A user MAY create their own custom Metrics Worker.

## Interface

The Metrics Worker Interface MUST support the following behaviors:

- [AddTime](#addtime)
- [AddCount](#addcount)
- [AddProperty](#addproperty)
- [Flush](#flush)
- [Shutdown](#shutdown)

### AddTime

This interface MUST take a [label](#label) and a [milliseconds](#milliseconds) value as input.
It MAY take a [transactionId](#transactionid).

Used to record one time value for a metric name.
Each recorded value MUST be kept as a separate value, not summed,
so that statistics such as percentiles can be computed over them.

### AddCount

This interface MUST take a [label](#label) and a [count](#count) as input.
It MAY take a [transactionId](#transactionid).

Used to aggregate a sum from multiple count values with the same metric name.

### AddProperty

This interface MUST take a [label](#label) and a [value](#value) as input.
It MAY take a [transactionId](#transactionid).

Used to add context/metadata in the form of a key-value pair related to a Metrics reference.

### Flush

This interface MUST take a [transactionId](#transactionid) as input.

Used to signal that no more measurements will be added for a transactionId.

### Shutdown

This interface takes no input.

Used to signal that the worker will receive no more calls,
so it can write any measurements it still holds.

## Security Considerations

A Metrics Worker publishes to a destination outside the library's control,
such as a log file, standard output, or a remote service.
Any value passed to a Metrics Worker is readable by anyone who can read that destination.

Callers of this interface MUST NOT pass a plaintext, a data key,
or any other secret as a [label](#label) or a [value](#value).

Callers of this interface MUST NOT pass an [encryption context](structures.md#encryption-context) key or value
as a [label](#label) or a [value](#value),
because the encryption context is customer data.

A [label](#label) SHOULD name a measurement the library defines
rather than a value taken from the request,
so that the number of distinct labels a destination sees
does not grow with the number of requests.

## Proposed Smithy model

```smithy
namespace aws.cryptography.materialProviders

use aws.polymorph#reference
use aws.polymorph#positional
use aws.polymorph#extendable
use aws.polymorph#javadoc

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

// Metrics Worker Structures

@reference(resource: MetricsWorker)
structure MetricsWorkerReference {}

// The @pattern trait covers the printable ASCII range a label is limited to.
// "MUST NOT contain only whitespace" is not expressible as a pattern over that
// same range, so an implementation enforces that part when it validates input.
@length(min: 1, max: 255)
@pattern("^[\\x20-\\x7E]+$")
string MetricsLabel

// Metrics Worker Operations

//= aws-encryption-sdk-specification/framework/metrics-worker.md#addtime
//= type=implication
//# This interface MUST take a [label](#label) and a [milliseconds](#milliseconds) value as input.
operation AddTime {
  input: AddTimeInput,
  output: AddTimeOutput,
}

@javadoc("Inputs for recording one time value.")
structure AddTimeInput {
  @required
  @javadoc("The name of the metric this value belongs to.")
  label: MetricsLabel,

  @required
  @javadoc("The length of time in milliseconds.")
  milliseconds: NonNegativeDouble,

  @javadoc("The identifier of the client request this value belongs to.")
  transactionId: String
}

structure AddTimeOutput {}

//= aws-encryption-sdk-specification/framework/metrics-worker.md#addcount
//= type=implication
//# This interface MUST take a [label](#label) and a [count](#count) as input.
operation AddCount {
  input: AddCountInput,
  output: AddCountOutput,
}

@javadoc("Inputs for recording a count to sum.")
structure AddCountInput {
  @required
  @javadoc("The name of the metric this count belongs to.")
  label: MetricsLabel,

  @required
  @javadoc("The number of occurrences to add to the metric's sum.")
  count: Long,

  @javadoc("The identifier of the client request this count belongs to.")
  transactionId: String
}

structure AddCountOutput {}

//= aws-encryption-sdk-specification/framework/metrics-worker.md#addproperty
//= type=implication
//# This interface MUST take a [label](#label) and a [value](#value) as input.
operation AddProperty {
  input: AddPropertyInput,
  output: AddPropertyOutput,
}

@javadoc("Inputs for attaching context to a label.")
structure AddPropertyInput {
  @required
  @javadoc("The name this context is attached to.")
  label: MetricsLabel,

  @required
  @javadoc("The context attached to the label.")
  value: String,

  @javadoc("The identifier of the client request this context belongs to.")
  transactionId: String
}

structure AddPropertyOutput {}

//= aws-encryption-sdk-specification/framework/metrics-worker.md#flush
//= type=implication
//# This interface MUST take a [transactionId](#transactionid) as input.
operation Flush {
  input: FlushInput,
  output: FlushOutput,
}

@javadoc("Inputs for signalling that a client request has no more measurements.")
structure FlushInput {
  @required
  @javadoc("The identifier of the client request that has no more measurements.")
  transactionId: String
}

structure FlushOutput {}

operation Shutdown {
  input: ShutdownInput,
  output: ShutdownOutput,
}

structure ShutdownInput {}

structure ShutdownOutput {}

// Metrics Worker Constructors

@positional
@javadoc("Outputs for creating a Metrics Worker.")
structure CreateMetricsWorkerOutput {
  @required
  @javadoc("The created Metrics Worker.")
  metricsWorker: MetricsWorkerReference
}
```
