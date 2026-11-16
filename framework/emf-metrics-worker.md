[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# EMF Metrics Worker

_NOTE: Draft. Not yet reviewed._

## Version

0.1.0

### Changelog

- 0.1.0
  - Initial record

## Implementations

| Library | Version Introduced | Implementation |
| ------- | ------------------ | -------------- |
| MPL     | T.B.D              | T.B.D          |

## Overview

The EMF Metrics Worker is the [Metrics Worker](metrics-worker.md) implementation
that Crypto Tools ships.
It writes the measurements it receives as
[CloudWatch Embedded Metric Format (EMF)](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html)
log lines to a local file or to standard output.

The EMF Metrics Worker does not call any AWS service.
A customer who wants the measurements in Amazon CloudWatch ships the output
with their own log pipeline, for example:

- the CloudWatch agent configured to collect the file,
- AWS Lambda, which sends standard output to CloudWatch Logs,
- the Amazon ECS `awslogs` log driver, which sends standard output to CloudWatch Logs.

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

### Sink

A sink is the destination EMF documents are written to.
The supported sinks are [File](#file-sink) and [Stdout](#stdout-sink).

## Initialization

On initialization the caller MUST provide:

- A namespace
- A [sink](#sink)

On initialization the caller MAY provide:

- A list of dimension keys
- A maximum queue size

The namespace MUST be used as the `Namespace` of every metric directive the worker writes.

If the list of dimension keys is not provided, the worker MUST NOT write any dimensions.

The list of dimension keys MUST NOT contain more than 30 keys.

Each dimension key MUST contain 1 to 250 printable ASCII characters,
MUST NOT contain only whitespace,
and MUST NOT start with a colon (`:`).

Initialization MUST fail if any of the above conditions are not met.

If the maximum queue size is not provided, the worker MUST use an implementation-defined bounded value.

### File sink

On initialization of a file sink the caller MUST provide:

- A file path
- A maximum file size in bytes
- A maximum number of files

The worker MUST append to the file at the file path.

If the file does not exist, the worker MUST create it with permissions
that allow only the owning user to read and write it.

When writing a document would make the file larger than the maximum file size,
the worker MUST rotate the file before writing.

The worker MUST NOT keep more files than the maximum number of files,
counting the active file.

The worker MAY delegate writing, rotation, and retention to the language's
logging framework, as long as every requirement in this section holds.

### Stdout sink

The stdout sink has no configuration.

The worker MUST write each document to the process's standard output.

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

Flush MUST build the documents for the open transaction,
enqueue them for the sink,
and remove the open transaction.

Flush MUST NOT perform I/O on the calling thread.

Flush MUST NOT return an error or throw an exception to the caller.

If there is no open transaction for the transactionId, Flush MUST do nothing.

### Shutdown

Shutdown MUST flush every open transaction.

Shutdown MUST attempt to write every queued document to the sink before returning.

After Shutdown returns, every other behavior MUST do nothing.

## Building documents

### Mapping records to members

For each AddCount label, the worker MUST write a metric member
whose value is the sum of the counts recorded for that label,
with a metric definition whose `Unit` is `Count`.

For each AddTime label, the worker MUST write a metric member
whose value is an array of the recorded milliseconds values, in the order they were recorded,
with a metric definition whose `Unit` is `Milliseconds`.

For each AddProperty label in the list of dimension keys,
the worker MUST write a top-level member whose value is the last recorded value
and MUST include the label in the document's dimension set.

For each AddProperty label not in the list of dimension keys,
the worker MUST write a top-level member whose value is the last recorded value.
That label MUST NOT be included in the dimension set.

If an AddProperty value for a dimension key does not contain
1 to 1024 printable ASCII characters, or contains only whitespace,
the worker MUST NOT include that label in the dimension set.

If the record has a transactionId, the worker MUST write it as a top-level member named `TransactionId`.
`TransactionId` MUST NOT be included in the dimension set.

### Metadata

Every document MUST contain an `_aws` member with:

- `Timestamp`: the time Flush was called, in milliseconds since epoch.
- `CloudWatchMetrics`: one metric directive with the configured namespace,
  one dimension set as described in [Mapping records to members](#mapping-records-to-members),
  and the document's metric definitions.

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

If the queue is full, the worker MUST drop the document being enqueued.

The worker MUST bound the memory used by open transactions.
When that bound is reached, the worker MUST drop new records.

The worker MUST count every record and document it drops.

When the dropped count is non-zero, the worker MUST include it in the next document it writes
as a metric member named `MetricsWorkerDropped` with `Unit` `Count`,
then reset the count.

If writing to the sink fails, the worker MUST drop the document and count it as dropped.

The worker MUST NOT retry a failed write.

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

### Example CloudWatch agent configuration for the file sink

No EMF-specific setting is needed.
The agent's `emf` field is
[documented as legacy](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html).

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/myapp/crypto-tools-metrics.log",
            "log_group_name": "myapp-crypto-tools-metrics"
          }
        ]
      }
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

structure CreateEmfMetricsWorkerInput {
  @required
  namespace: String,
  @required
  sink: EmfSink,
  dimensionKeys: DimensionKeyList,
  maxQueueSize: PositiveInteger
}

@length(max: 30)
list DimensionKeyList {
  member: String
}

union EmfSink {
  file: EmfFileSink,
  stdout: EmfStdoutSink
}

structure EmfFileSink {
  @required
  path: String,
  @required
  maxFileSizeBytes: PositiveLong,
  @required
  maxFiles: PositiveInteger
}

structure EmfStdoutSink {}

structure CreateMetricsWorkerOutput {
  @required
  metricsWorker: MetricsWorkerReference
}
```
