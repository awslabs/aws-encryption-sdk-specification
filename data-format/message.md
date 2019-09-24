[//]: # (Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.)
[//]: # (SPDX-License-Identifier: CC-BY-SA-4.0)

# Message

## Version

0.1.0-preview

## Overview

A message is a formatted structure that contains encrypted data and associated metadata.

## Structure

A message is a sequence of bytes that is the serialization of the following, in order:

- [Message Header](#message-header.md)
- [Message Body](#message-body.md)

If the [message header](#message-header.md) contains an [algorithm suite](#algorithmm-suites.md) in the
[algorithm suite ID](#message-header.md#algorithm-suite-id) field that contains a
[signature algorithm](#algorithm-suites.md#signature-algorithm), the message MUST also contain a
[message footer](#message-footer.md), serialized after the [message body](#message-body.md).
