[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Message Body AAD

## Overview

The message body AAD is the serialization of the AAD to be used as input to encryption of the message body.

## Structure

The following table is a non-normative representation of the normative requirements in this section.
The bytes are appended in the order shown.

| Field            | Length (bytes) | Interpreted as |
| ---------------- | -------------- | -------------- |
| Message ID       | Variable.      | Bytes          |
| Body AAD Content | Variable.      | UTF-8 Bytes    |
| Sequence Number  | 4              | UInt32         |
| Content Length   | 8              | UInt64         |

The message body AAD MUST consist of, in order,
Message ID,
Body AAD Content,
Sequence Number,
and Content Length.

### Message ID

An identifier for the [message](message.md) this message body AAD is associated with.
This MUST be the [message ID](message-header.md#message-id) stored in the header of the message.
The length of the Message ID field MUST be equal to the length of the [Message ID](message-header.md#message-id) defined by the message header version.

### Body AAD Content

An identifier for the content type of the data this message body AAD is associated with.

This value depends on the [content type](message-header.md#content-type) of the [message](message.md):

- [Non-framed data](message-body.md#non-framed-data) MUST use the value `AWSKMSEncryptionClient Single Block`.
- The [regular frames](message-body.md#regular-frame) in [framed data](message-body.md#framed-data) MUST use the value `AWSKMSEncryptionClient Frame`.
- The [final frame](message-body.md#final-frame) in [framed data](message-body.md#framed-data) MUST use the value `AWSKMSEncryptionClient Final Frame`.

The body AAD content value MUST be encoded as UTF-8 bytes.

### Sequence Number

The sequence number of the data this message body AAD belongs to.
For [framed data](message-body.md#framed-data), the value of this field MUST be the [frame sequence number](message-body.md#regular-frame-sequence-number).
For [non-framed data](message-body.md#non-framed-data), the value of this field MUST be `1`.
The length of the sequence number field MUST be 4 bytes.
The sequence number field MUST be interpreted as a UInt32.

### Content Length

The length, in bytes, of the plaintext data being encrypted that this message body AAD is associated with.

The length of the content length field MUST be 8 bytes.
The content length field MUST be interpreted as a UInt64.

More specifically, depending on the [content type](message-header.md#content-type) of the [message](message.md):

- For [non-framed data](message-body.md#non-framed-data), this value MUST equal the length, in bytes,
  of the plaintext data provided to the algorithm for encryption.
- For [framed data](message-body.md#framed-data), this value MUST equal the length, in bytes,
  of the plaintext being encrypted in this frame.
  - For [regular frames](message-body.md#regular-frame), this value MUST equal the value of
    the [frame length](message-header.md#frame-length) field in the message header.
  - For the [final frame](message-body.md#final-frame), this value MUST be greater than or equal to
    0 and less than or equal to the value of the [frame length](message-header.md#frame-length)
    field in the message header.
