[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Streaming

## Version

0.1.0

## Changelog

- 0.1.0

  - [Clarify Streaming Encrypt and Decrypt](../changes/2020-07-06_clarify-streaming-encrypt-decrypt/change.md)

## Overview

The AWS Encryption SDK MAY provide APIs that enable streamed [encryption](encrypt.md)
and [decryption](decrypt.md).
Streaming is a framework for making bytes available to be processed
by an operation sequentially and over time,
and for outputting the result of that processing
sequentially and over time.

If an implementation requires holding the entire input in memory in order to perform the operation,
that implementation SHOULD NOT provide an API that allows the caller to stream the operation.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC2119](https://tools.ietf.org/html/rfc2119).

### Available Bytes

In the scope of an operation, bytes are considered available if
the operation has not yet processed those bytes
and those bytes are intended to be processed.
This intention is expressed through the specific streaming interface.

For example, in a framework where a customer is requesting output bytes from an operation
and that operation must read from some source in order to produce bytes,
bytes read from the source are considered available and MUST be processed.
Here it is the operation expressing intent to process a set of input bytes.
Even if more bytes MAY be read from the source,
bytes are not considered available to an operation
until they have been consumed from the source.

In a framework where a customer is sending input bytes to an operation
and that operation must write those bytes to some sink,
the bytes received from the customer are considered available and MUST be processed.
Here the customer is expressing intent to process their supplied bytes.

### Release

An operation releases processed bytes when those bytes are outputted by the operation.

If bytes are processed by an operation, that does not imply that the operation is allowed to
release those bytes.
The decrypt and encrypt operations specify when processed bytes SHOULD be released,
and when they MUST NOT be released.

## Inputs

In order to support streaming, the operation MUST accept some input within a streaming framework.

This means that:

- There MUST be a mechanism for input bytes to become available to be processed.
- There MUST be a mechanism to indicate that there are no more input bytes,
  or whether more bytes MAY be made available in the future.

These mechanisms are used to allow the operation to process input bytes in parts, over time.

The bytes that represent the entire input to the operation are the bytes that were made available
up until an end was indicated or the operation is able to determine
that the bytes made available represent the full input.

The [encrypt](encrypt.md) operation is unable to determine whether it has processed the entire
input on its own, and thus MUST NOT complete until an end to the input is indicated.

If an operation is able to determine that is has received the full input without an end being
indicated, the operation MUST fail if more bytes become available.

## Outputs

In order to support streaming, the operation MUST return some output within a streaming framework.

This means that:

- There MUST be a mechanism for output bytes to be released
- There MUST be a mechanism to indicate that the entire output has been released,
  or whether more bytes MAY be released in the future.

These mechanisms are used to allow the operation output to process bytes in parts, over time.

The bytes that represent the entire output to the operation are the bytes that were released
up until an end was indicated.

Operations MUST NOT indicate completion or success until an end to the output has been indicated.

## Behavior

By using the mechanisms for [inputs](#inputs) and [outputs](#outputs),
some actor expresses intent through a streaming interface
for bytes to be made available to the operation
and for bytes to be released by the operation.

The behavior of the operation specifies how the operation processes available bytes,
and specifies when processed bytes MAY be released.
