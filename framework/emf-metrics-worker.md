[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# EMF Metrics Worker

## Version

1.0.0

### Changelog

- 1.0.0
  - Initial record

## Overview

A [Metrics Worker](metrics-worker.md) implementation
that writes the measurements it receives as
[CloudWatch Embedded Metric Format (EMF)](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html)
log lines.
In languages where AWS publishes an [EMF library](#emf-library),
the worker is a wrapper around that EMF library.
In other languages, the worker writes to standard output or to a CloudWatch agent itself.

The EMF Metrics Worker does not call any AWS service.
A customer who wants the measurements in Amazon CloudWatch ships the output
with their own log pipeline, for example:

- The CloudWatch agent, which receives documents from the [agent sink](#agent-sink).
- AWS Lambda, which sends standard output to CloudWatch Logs.
- Amazon ECS `awslogs` log driver, which sends standard output to CloudWatch Logs.

CloudWatch Logs extracts metrics from log events that follow the EMF specification.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

### EMF document

An EMF document is a single JSON object that conforms to the
[EMF specification](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html).

### Record

A record is the data from one call to
[AddTime](metrics-worker.md#addtime),
[AddCount](metrics-worker.md#addcount),
or [AddProperty](metrics-worker.md#addproperty).

### Open transaction

An open transaction is the set of records the worker holds for one
[transactionId](metrics-worker.md#transactionid)
that has not yet been [flushed](#flush).

### EMF library

An EMF library is an external package, published by AWS,
that builds and serializes EMF documents,
for example `aws-embedded-metrics-java`.
The EMF libraries this worker uses are listed in [Implementation](#implementation).

An EMF library is a dependency of the EMF Metrics Worker.
It is never the Crypto Tools library (for example the ESDK, MPL, or DB-ESDK)
that a customer passes the Metrics Worker to.

### Sink

A sink is the destination EMF documents are written to.
A worker without an EMF library supports the [Stdout](#stdout-sink) and [Agent](#agent-sink) sinks.
A worker with an EMF library writes to whatever destination the EMF library uses.

### EMF library client

An EMF library client is the object an EMF library uses to write documents
and that holds its configuration,
for example a `DefaultEnvironment` in `aws-embedded-metrics-java`.
Each EMF library defines its own client and configuration types.

## Implementation

### Languages with an EMF library

In languages where AWS publishes an [EMF library](#emf-library),
the worker MUST be a wrapper around that EMF library:

| Language | EMF library                                                                           |
| -------- | ------------------------------------------------------------------------------------- |
| Java     | [aws-embedded-metrics-java](https://github.com/awslabs/aws-embedded-metrics-java)     |
| Python   | [aws-embedded-metrics-python](https://github.com/awslabs/aws-embedded-metrics-python) |
| Node.js  | [aws-embedded-metrics-node](https://github.com/awslabs/aws-embedded-metrics-node)     |
| .NET     | [aws-embedded-metrics-dotnet](https://github.com/awslabs/aws-embedded-metrics-dotnet) |
| Rust     | [metrique](https://github.com/awslabs/metrique) (`metrique-writer-format-emf`)        |

The Java, Python, Node.js, and .NET EMF libraries are the
[EMF client libraries](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Libraries.html)
listed in the CloudWatch documentation.

The worker MUST build, serialize, and write documents through the EMF library.

How documents are written is the EMF library's behavior, not the worker's.
This includes where documents are written, queuing, retries, which documents are dropped,
the dimensions the EMF library adds by default, environment metadata,
and configuration the EMF library reads from the environment.

The worker MUST keep the dimensions the EMF library writes
and MUST add the dimensions selected as described in
[Mapping records to members](#mapping-records-to-members) to that dimension set.

The dimension set, including the EMF library's dimensions,
MUST NOT contain more than 30 dimension keys.

The requirements in [Stdout sink](#stdout-sink), [Agent sink](#agent-sink),
[Metadata](#metadata), [Serialization](#serialization),
and [Queue and failure handling](#queue-and-failure-handling)
do not apply to a worker with an EMF library.

### Languages without an EMF library

In every other language, the worker MUST build, serialize, and write documents itself,
without an EMF library,
and MUST meet every requirement in this document.

## Initialization

On initialization the caller MAY provide:

- A list of dimension keys

For a worker with an EMF library, the caller MAY also provide one of:

- An EMF library configuration
- An [EMF library client](#emf-library-client)

If an EMF library client is provided, the worker MUST write documents through it.
If an EMF library configuration is provided, the worker MUST create an EMF library client from it.
If neither is provided, the worker MUST create an EMF library client
with the EMF library's default configuration.

For a worker without an EMF library, the caller MUST provide:

- A namespace
- A [sink](#sink)

and MAY provide:

- A maximum queue size

For a worker without an EMF library,
the namespace MUST be used as the `Namespace` of every metric directive the worker writes.

If the list of dimension keys is not provided, the worker MUST NOT add any dimensions
beyond those an EMF library writes.

The list of dimension keys MUST NOT contain more than 30 keys.

Each dimension key MUST contain 1 to 250 printable ASCII characters,
MUST NOT contain only whitespace,
and MUST NOT start with a colon (`:`).

Initialization MUST fail if any of the above conditions are not met.

For a worker without an EMF library, if the maximum queue size is not provided,
the worker MUST use an implementation-defined bounded value.

### Stdout sink

The stdout sink has no configuration.

The worker MUST write each document to the process's standard output.

### Agent sink

The agent sink sends documents to a
[CloudWatch agent listening for EMF](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Generation_CloudWatch_Agent.html).

On initialization of an agent sink the caller MUST provide:

- A log group name

On initialization of an agent sink the caller MAY provide:

- An endpoint, as a TCP or UDP host and port

If the endpoint is not provided, the worker MUST use TCP to `127.0.0.1` on port `25888`.

Every document sent to the agent sink MUST contain a `LogGroupName` member
in its `_aws` metadata, whose value is the configured log group name.

The endpoint SHOULD be on the local host.
The agent protocol is not encrypted.

For TCP, if the connection is closed or a write fails,
the worker MUST treat the write as failed and MUST open a new connection for the next write.

For UDP, each datagram MUST contain exactly one document.

## Behaviors

Every behavior MUST be safe to call concurrently from multiple threads.

Records from concurrent calls with different transactionIds
MUST NOT be written to the same document.

### Recording

[AddTime](metrics-worker.md#addtime),
[AddCount](metrics-worker.md#addcount),
and [AddProperty](metrics-worker.md#addproperty)
MUST only add the record to an in-memory buffer.

These behaviors MUST NOT perform I/O on the calling thread.

These behaviors MUST NOT return an error or throw an exception to the caller.

If the record has a transactionId, the worker MUST add it to the open transaction for that transactionId.

If the record has no transactionId, the worker MUST enqueue a document containing only that record.

If the label is `_aws` or `TransactionId`, the worker MUST drop the record.

If the label does not contain 1 to 255 printable ASCII characters,
or contains only whitespace,
the worker MUST drop the record.

If the label already appears in the open transaction from a different behavior,
the worker MUST drop the record.

### Flush

Flush MUST build the documents for the open transaction
and remove the open transaction.

A worker with an EMF library MUST pass the documents to the EMF library.
Whether that performs I/O on the calling thread is the EMF library's behavior.

A worker without an EMF library MUST enqueue the documents for the sink
and MUST NOT perform I/O on the calling thread.

Flush MUST NOT return an error or throw an exception to the caller.

If there is no open transaction for the transactionId, Flush MUST do nothing.

### Shutdown

Shutdown MUST flush every open transaction.

A worker without an EMF library MUST attempt to write every queued document
to the sink before returning.

A worker with an EMF library MUST shut down the EMF library client
only if the worker created it.
If the caller provided the EMF library client, the caller owns its lifecycle,
and Shutdown MUST NOT shut it down.

After Shutdown returns, every other behavior MUST do nothing.

## Building documents

### Mapping records to members

#### AddCount

For each AddCount label, the worker MUST write a metric member
whose value is the sum of the counts recorded for that label,
with a metric definition whose `Unit` is `Count`.

#### AddTime

For each AddTime label, the worker MUST write a metric member
whose value is an array of the recorded milliseconds values, in the order they were recorded,
with a metric definition whose `Unit` is `Milliseconds`.

#### AddProperty

For each AddProperty label in the list of dimension keys,
the worker MUST write a top-level member whose value is the last recorded value
and MUST include the label in the document's dimension set.

For each AddProperty label not in the list of dimension keys,
the worker MUST write a top-level member whose value is the last recorded value.
That label MUST NOT be included in the dimension set.

If an AddProperty value for a dimension key does not contain
1 to 1024 printable ASCII characters, or contains only whitespace,
the worker MUST NOT include that label in the dimension set.

#### TransactionId

If the record has a transactionId, the worker MUST write it as a top-level member named `TransactionId`.
`TransactionId` MUST NOT be included in the dimension set.

### Metadata

Every document MUST contain an `_aws` member with:

- `Timestamp`: the time Flush was called, in milliseconds since epoch.
- `CloudWatchMetrics`: one metric directive with the configured namespace,
  one dimension set as described in [Mapping records to members](#mapping-records-to-members),
  and the document's metric definitions.
- `LogGroupName`: for the [agent sink](#agent-sink) only, the configured log group name.

### Limits

A document MUST NOT contain more than 100 metric definitions.

A metric member whose value is an array MUST NOT contain more than 100 values.

If an open transaction has more than 100 metric members,
the worker MUST split them across multiple documents.

If an AddTime label has more than 100 recorded values,
the worker MUST split the values across multiple documents.
Every document from the same transaction MUST contain the same `TransactionId`,
dimension members, and non-metric members.

### Serialization

Each document MUST be serialized as compact JSON on a single line,
followed by a single newline character.

A serialized document MUST NOT contain any other newline character.

## Queue and failure handling

The worker MUST hold enqueued documents in a queue no larger than the maximum queue size.

The worker MUST write queued documents to the sink from a thread or task
other than the threads that call the behaviors.

If the queue is full, the worker MUST drop either the document being enqueued
or the oldest document in the queue.

The worker MUST bound the memory used by open transactions.
When that bound is reached, the worker MUST drop new records.

The worker MUST count every record and document it drops.

When the dropped count is non-zero, the worker MUST include it in the next document it writes
as a metric member named `MetricsWorkerDropped` with `Unit` `Count`,
then reset the count.

If writing to the sink fails, the worker MAY retry the write
a bounded number of times, with a delay between attempts.

Retries MUST run on the thread or task that writes to the sink,
never on the threads that call the behaviors.

If the write still fails after the last attempt, or the worker does not retry,
the worker MUST drop every document in that write and count each one as dropped.

If a failed write may have written part of a document,
the worker MUST write a newline character before the next document it writes,
so that the next document starts on its own line.

### Batching

The worker MAY write several queued documents to the sink in a single write.

A single write MUST contain only complete serialized documents,
each followed by its newline character.

The worker MUST NOT split one serialized document across more than one write.

The worker MUST NOT wait for more documents to arrive before writing.
Each write MUST contain the documents that are queued when the write starts,
up to the batch limits below.

A single write MUST NOT contain more than an implementation-defined number of documents
or bytes.

For the [agent sink](#agent-sink) over UDP, the worker MUST NOT batch documents.

## Security considerations

The worker writes labels and values verbatim.
It cannot tell whether a value is sensitive.
Callers are responsible for never passing plaintext, key material,
or encryption context values to a Metrics Worker.

## Appendix

### Example document

One Encrypt call with `Library` and `Operation` as dimension keys:

```json
{
  "_aws": {
    "Timestamp": 1762977600000,
    "CloudWatchMetrics": [
      {
        "Namespace": "MyApp/CryptoTools",
        "Dimensions": [["Library", "Operation"]],
        "Metrics": [
          { "Name": "KmsCallCount", "Unit": "Count" },
          { "Name": "OperationLatency", "Unit": "Milliseconds" }
        ]
      }
    ]
  },
  "Library": "ESDK-Java",
  "Operation": "Encrypt",
  "KmsCallCount": 1,
  "OperationLatency": 12,
  "AlgorithmSuite": "0x0578",
  "TransactionId": "7f3c2a"
}
```

### Example CloudWatch agent configuration for the agent sink

This configuration, from the
[CloudWatch documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Generation_CloudWatch_Agent.html),
makes the agent listen on the default endpoint, `tcp:25888`:

```json
{
  "logs": {
    "metrics_collected": {
      "emf": {}
    }
  }
}
```

If customers alarm on high-resolution metrics, they should leave the agent's
`force_flush_interval` at its default of 5 seconds.

EMF extraction failures are reported as metrics in the `AWS/Logs` namespace.

### Proposed Smithy model

```smithy
operation CreateEmfMetricsWorker {
  input: CreateEmfMetricsWorkerInput,
  output: CreateMetricsWorkerOutput,
}

// An EMF library configuration or client is language-specific
// and is not part of this shared model.
// Each language with an EMF library accepts it through its own native type.
structure CreateEmfMetricsWorkerInput {
  dimensionKeys: DimensionKeyList,
  // Required, and only used, for a worker without an EMF library.
  namespace: String,
  sink: EmfSink,
  maxQueueSize: PositiveInteger
}

@length(max: 30)
list DimensionKeyList {
  member: String
}

union EmfSink {
  stdout: EmfStdoutSink,
  agent: EmfAgentSink
}

structure EmfStdoutSink {}

structure EmfAgentSink {
  @required
  logGroupName: String,
  // For example "tcp://127.0.0.1:25888" or "udp://127.0.0.1:25888".
  endpoint: String
}

structure CreateMetricsWorkerOutput {
  @required
  metricsWorker: MetricsWorkerReference
}
```
