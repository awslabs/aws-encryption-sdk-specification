[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Message

## Overview

A message is a formatted structure that contains encrypted data and associated metadata.

## Structure

A message is a sequence of bytes that is the serialization of the following:

- The message MUST begin with [Message Header](message-header.md)
- The [Message Body](message-body.md) MUST follow the Message Header

If the [message header](message-header.md) contains an [algorithm suite](../framework/algorithm-suites.md) in the
[algorithm suite ID](message-header.md#algorithm-suite-id) field that contains a
[signature algorithm](../framework/algorithm-suites.md#signature-algorithm), the message MUST also contain a
[message footer](message-footer.md) serialized after the [message body](message-body.md).
If the algorithm suite does not contain a signature algorithm, the message MUST NOT contain a message footer.
If the [algorithm suite ID](message-header.md#algorithm-suite-id) is unrecognized or unsupported, or its
[algorithm suite](../framework/algorithm-suites.md) definition cannot be used to determine whether a
[signature algorithm](../framework/algorithm-suites.md#signature-algorithm) is required, the operation MUST raise
an error and MUST NOT treat any trailing bytes as a valid [message footer](message-footer.md).
