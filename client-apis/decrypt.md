[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Decrypt

## Overview

This document describes the AWS Encryption SDK's (ESDK's) decrypt operation,
used for decrypting a message that was previously encrypted by the ESDK.

## Definitions

### Authenticated Data

Plaintext or associated data is considered authenticated if the associated
authentication tag is successfully checked
as defined by the algorithm suite indicated in the message header.
The authentication tag may be from a [regular frame](../data-format/message-body.md#regular-frame-authentication-tag),
[final frame](../data-format/message-body.md#final-frame-authentication-tag),
or [nonframed data](../data-format/message-body.md#nonframed-data-authentication-tag).

This operation MUST NOT release any unauthenticated plaintext or unauthenticated associated data.

### Signed Data

Plaintext and associated data is considered signed if the associated [message signature](../data-format/message-footer.md)
is successfully verified using the [signature algorithm](../framework/algorithm-suites.md#signature-algorithm)
of the algorithm suite indicated in the message header.

## Input

Required arguments:

- The input to the Decrypt operation MUST accept a required [Encrypted Message](#encrypted-message) argument.
- The input to the Decrypt operation MUST accept an optional [Cryptographic Materials Manager (CMM)](../framework/cmm-interface.md) argument.
- The input to the Decrypt operation MUST accept an optional [Keyring](../framework/keyring-interface.md) argument.
  The Decrypt operation MUST validate that exactly one of a keyring or CMM was provided by the caller.
  If the caller does not provide exactly one of a keyring or CMM, the Decrypt operation MUST fail.

Optional arguments:

- The input to the Decrypt operation MUST accept an optional [Encryption Context](#encryption-context) argument.

### Encrypted Message

The encrypted message to decrypt.
The input encrypted message MUST be a sequence of bytes in the
[message format](../data-format/message.md) specified by the AWS Encryption SDK.
The encrypted message contains the list of [encrypted data keys](../data-format/message-header.md#encrypted-data-keys),
[encryption context](../data-format/message-header.md#aad), if provided during encryption,
[encrypted content](../data-format/message-body.md) and
[algorithm suite ID](../data-format/message-header.md#algorithm-suite-id) among other metadata.
Each key in the encrypted data key list is an encrypted version of the single plaintext data key that was used to encrypt the plaintext.
The encryption context is the additional authenticated data that was used during encryption.
The algorithm suite ID refers to the algorithm suite used to encrypt the message and is required to decrypt the encrypted message.

This input MAY be [streamed](streaming.md) to this operation.

If an implementation requires holding the entire encrypted message in memory in order to perform this operation,
that implementation SHOULD NOT provide an API that allows the caller to stream the encrypted message.

#### Encrypted Message Format

The message format is a binary format, but it is a common mistake for users to attempt decryption on the Base64 encoding of this data instead.
Because the first two bytes of the message format have a very limited set of possible values
(currently they are in fact fixed),
the first two bytes of the Base64 encoding of a valid message are also simple to recognize.

To make diagnosing this mistake easier, implementations SHOULD detect the first two bytes of the Base64 encoding of any supported message [versions](../data-format/message-header.md#version)
and [types](../data-format/message-header.md#type)
and fail with a more specific error message.
In particular, the hex values to detect for the current set of versions and types are:

| Version and type (hex) | Base64 encoding (ascii) | Base64 encoding (hex) |
| ---------------------- | ----------------------- | --------------------- |
| 01 80                  | A Y ...                 | 41 59 ...             |

Note that the bytes that follow the initial two in the Base64 encoding
partially depend on subsequent bytes in the binary message format
and hence are not as predictable.

### Cryptographic Materials Manager

A CMM that implements the [CMM interface](../framework/cmm-interface.md).

This CMM MUST obtain the [decryption materials](../framework/structures.md#decryption-materials) required for decryption.

### Keyring

A Keyring that implements the [keyring interface](../framework/keyring-interface.md).

If the Keyring is provided as the input, the client MUST construct a [default CMM](../framework/default-cmm.md) that uses this keyring,
to obtain the [decryption materials](../framework/structures.md#decryption-materials) that is required for decryption.
This default CMM constructed from the keyring MUST obtain the decryption materials required for decryption.

## Output

- The output of the Decrypt operation MUST include a [Plaintext](#plaintext) value.
- The output of the Decrypt operation MUST include an [encryption context](#encryption-context) value.
- The output of the Decrypt operation MUST include an [algorithm suite](#algorithm-suite) value.
- The output of the Decrypt operation SHOULD include a [Parsed Header](#parsed-header) value.

### Plaintext

The decrypted data.
This MUST be a sequence of bytes.

This operation MAY [stream](streaming.md) the plaintext as output.

If an implementation requires holding the entire encrypted message in memory in order to perform this operation,
that implementation SHOULD NOT provide an API that allows the caller to stream the encrypted message.

### Encryption Context

The [encryption context](../framework/structures.md#encryption-context) that is used as
additional authenticated data during the decryption of the input [encrypted message](#encrypted-message).

This output MAY be satisfied by outputting a [parsed header](#parsed-header) containing this value.

### Algorithm Suite

The [algorithm suite](../framework/algorithm-suites.md) that is used to decrypt
the input [encrypted message](#encrypted-message).

This algorithm suite MUST be [supported for the ESDK](../framework/algorithm-suites.md#supported-algorithm-suites-enum).

This output MAY be satisfied by outputting a [parsed header](#parsed-header) containing this value.

### Parsed Header

A collection of deserialized fields of the [encrypted message's](#encrypted-message) header.

## Behavior

The Decrypt operation is divided into several distinct steps:

- Decrypt operation Step 1 MUST be [Parse the header](#parse-the-header)
- Decrypt operation Step 2 MUST be [Get the decryption materials](#get-the-decryption-materials)
- Decrypt operation Step 3 MUST be [Verify the header](#verify-the-header)
- Decrypt operation Step 4 MUST be [Decrypt the message body](#decrypt-the-message-body)
- Decrypt operation Step 5 MUST be [Verify the signature](#verify-the-signature)
  - If the message header contains an algorithm suite including a
    [signature algorithm](../framework/algorithm-suites.md#signature-algorithm),
    the Decrypt operation MUST perform this step.
  - If the message header does not contain an algorithm suite including a signature algorithm,
    the Decrypt operation MUST NOT perform this step.

If the input encrypted message is not being [streamed](streaming.md) to this operation,
all output MUST NOT be released until after these steps complete successfully.

If the input encrypted message is being [streamed](streaming.md) to this operation:

- Output MUST NOT be released until otherwise indicated.
- If all bytes have been provided and this operation
  is unable to complete the above steps with the consumable encrypted message bytes,
  this operation MUST halt and indicate a failure to the caller.
- If this operation successfully completes the above steps
  but there are consumable bytes which are intended to be decrypted,
  this operation MUST fail.
- The ESDK MUST provide a configuration option that causes the decryption operation
  to fail immediately after parsing the header if a signed algorithm suite is used.
  This can be used to ensure that data not yet [verified as signed data](#security-considerations)
  is never released early.

### Parse the header

Given encrypted message bytes, this operation MUST process those bytes sequentially,
deserializing those bytes according to the [message format](../data-format/message.md).

This operation MUST attempt to deserialize all consumable encrypted message bytes until it has
successfully deserialized a valid [message header](../data-format/message-header.md).

The header deserialization order MUST follow the [Header Body Version 1.0](../data-format/message-header.md#header-body-version-10)
or [Header Body Version 2.0](../data-format/message-header.md#header-body-version-20) specification,
depending on the [Version](../data-format/message-header.md#version) field.

Each header field MUST be deserialized according to its specification in the [message header](../data-format/message-header.md).

The [Version](../data-format/message-header.md#version) field MUST be deserialized first.
The value MUST be a [supported version](../data-format/message-header.md#supported-versions).

#### V1 Header Deserialization

If the version is [1.0](../data-format/message-header.md#supported-versions),
the remaining header fields MUST be deserialized according to the
[Header Body Version 1.0](../data-format/message-header.md#header-body-version-10) specification:

- The Decrypt operation MUST deserialize the [Type](../data-format/message-header.md#type).
  The value MUST be a [supported type](../data-format/message-header.md#supported-types).
- The Decrypt operation MUST deserialize the [Algorithm Suite ID](../data-format/message-header.md#algorithm-suite-id).
- The Decrypt operation MUST deserialize the [Message ID](../data-format/message-header.md#message-id).
- The Decrypt operation MUST deserialize the [AAD](../data-format/message-header.md#aad).
- The Decrypt operation MUST deserialize the [Encrypted Data Keys](../data-format/message-header.md#encrypted-data-keys).
- The Decrypt operation MUST deserialize the [Content Type](../data-format/message-header.md#content-type).
  The value MUST be a [supported content type](../data-format/message-header.md#supported-content-types).
- The Decrypt operation MUST deserialize the [Reserved](../data-format/message-header.md#reserved).
- The Decrypt operation MUST deserialize the [IV Length](../data-format/message-header.md#iv-length).
- The Decrypt operation MUST deserialize the [Frame Length](../data-format/message-header.md#frame-length).

The Decrypt operation MUST then deserialize the
[Header Authentication Version 1.0](../data-format/message-header.md#header-authentication-version-10):

- The Decrypt operation MUST deserialize the [IV](../data-format/message-header.md#iv).
- The Decrypt operation MUST deserialize the [Authentication Tag](../data-format/message-header.md#authentication-tag).

#### V2 Header Deserialization

If the version is [2.0](../data-format/message-header.md#supported-versions),
the remaining header fields MUST be deserialized according to the
[Header Body Version 2.0](../data-format/message-header.md#header-body-version-20) specification:

- The Decrypt operation MUST deserialize the [Algorithm Suite ID](../data-format/message-header.md#algorithm-suite-id).
- The Decrypt operation MUST deserialize the [Message ID](../data-format/message-header.md#message-id).
- The Decrypt operation MUST deserialize the [AAD](../data-format/message-header.md#aad).
- The Decrypt operation MUST deserialize the [Encrypted Data Keys](../data-format/message-header.md#encrypted-data-keys).
- The Decrypt operation MUST deserialize the [Content Type](../data-format/message-header.md#content-type).
  The value MUST be a [supported content type](../data-format/message-header.md#supported-content-types).
- The Decrypt operation MUST deserialize the [Frame Length](../data-format/message-header.md#frame-length).
- The Decrypt operation MUST deserialize the [Algorithm Suite Data](../data-format/message-header.md#algorithm-suite-data).

The Decrypt operation MUST then deserialize the
[Header Authentication Version 2.0](../data-format/message-header.md#header-authentication-version-20):

- The Decrypt operation MUST deserialize the [Authentication Tag](../data-format/message-header.md#authentication-tag).

If the number of [encrypted data keys](../framework/structures.md#encrypted-data-keys)
deserialized from the [message header](../data-format/message-header.md)
is greater than the [maximum number of encrypted data keys](client.md#maximum-number-of-encrypted-data-keys) configured in the [client](client.md),
then as soon as that can be determined during deserializing
decrypt MUST process no more bytes and yield an error.

This operation MUST wait if it doesn't have enough consumable encrypted message bytes to
deserialize the next field of the message header until enough input bytes become consumable or
the caller indicates an end to the encrypted message.

Until the [header is verified](#verify-the-header), this operation MUST NOT
release any parsed information from the header.

### Get the decryption materials

If the parsed [algorithm suite ID](../data-format/message-header.md#algorithm-suite-id)
is not supported by the [commitment policy](client.md#commitment-policy)
configured in the [client](client.md) decrypt MUST yield an error.

To verify the message header and decrypt the message body,
a set of valid decryption materials is required.

This operation MUST obtain this set of [decryption materials](../framework/structures.md#decryption-materials),
by calling [Decrypt Materials](../framework/cmm-interface.md#decrypt-materials) on a [CMM](../framework/cmm-interface.md).

The CMM used MUST be the input CMM, if supplied.
If a CMM is not supplied as the input, the decrypt operation MUST construct a [default CMM](../framework/default-cmm.md)
from the input [keyring](../framework/keyring-interface.md).

The call to the CMM's [Decrypt Materials](../framework/cmm-interface.md#decrypt-materials) operation
MUST be constructed as follows:

- Encryption Context: This MUST be the parsed [encryption context](../data-format/message-header.md#aad)
  from the message header.
- Algorithm Suite ID: This MUST be the parsed
  [algorithm suite ID](../data-format/message-header.md#algorithm-suite-id)
  from the message header.
- Encrypted Data Keys: This MUST be the parsed [encrypted data keys](../data-format/message-header.md#encrypted-data-keys)
  from the message header.
- Reproduced Encryption Context: This MUST be the [input](#input) encryption context.
- Commitment Policy: This MUST be the commitment policy configured on the client.

The data key used as input for all decryption described below MUST be a data key derived from the plaintext data key
included in the [decryption materials](../framework/structures.md#decryption-materials).
The algorithm suite used as input for all decryption described below MUST be the algorithm suite
included in the [decryption materials](../framework/structures.md#decryption-materials).
If this algorithm suite is not [supported for the ESDK](../framework/algorithm-suites.md#supported-algorithm-suites-enum)
decrypt MUST yield an error.
If the algorithm suite is not supported by the [commitment policy](client.md#commitment-policy)
configured in the [client](client.md) decrypt MUST yield an error.
If the [algorithm suite](../framework/algorithm-suites.md#algorithm-suites-encryption-key-derivation-settings) supports [key commitment](../framework/algorithm-suites.md#key-commitment)
then the [commit key](../framework/algorithm-suites.md#commit-key) MUST be derived from the plaintext data key
using the [commit key derivation](../framework/algorithm-suites.md#algorithm-suites-commit-key-derivation-settings).
The derived commit key MUST equal the commit key stored in the message header.
The algorithm suite used to derive a data key from the plaintext data key MUST be
the [key derivation algorithm](../framework/algorithm-suites.md#key-derivation-algorithm) included in the
[algorithm suite](../framework/algorithm-suites.md) associated with
the returned decryption materials.
This document refers to the output of the key derivation algorithm as the derived data key.
If the key derivation algorithm is the [identity KDF](../framework/algorithm-suites.md#identity-kdf),
then the derived data key MUST be the same as the plaintext data key.

### Verify the header

Once a valid message header is deserialized and decryption materials are available,
this operation MUST validate the [message header body](../data-format/message-header.md#header-body)
by using the [authenticated encryption algorithm](../framework/algorithm-suites.md#encryption-algorithm)
to decrypt with the following inputs:

- The AAD MUST be the concatenation of the serialized [message header body](../data-format/message-header.md#header-body)
  and the serialization of encryption context to only authenticate.
  The encryption context to only authenticate MUST be the [encryption context](../framework/structures.md#encryption-context)
  in the [decryption materials](../framework/structures.md#decryption-materials)
  filtered to only contain key value pairs listed in
  the [decryption material's](../framework/structures.md#decryption-materials)
  [required encryption context keys](../framework/structures.md#required-encryption-context-keys-1)
  serialized according to the [encryption context serialization specification](../framework/structures.md#serialization).
- For message format version [1.0](../data-format/message-header.md#supported-versions)
  the IV MUST be the value serialized in the message header's [IV field](../data-format/message-header.md#iv).
  For message format version [2.0](../data-format/message-header.md#supported-versions)
  the IV MUST be 0.
- the cipherkey MUST be the derived data key
- the ciphertext MUST be an empty byte array
- the tag MUST be the value serialized in the message header's
  [authentication tag field](../data-format/message-header.md#authentication-tag)

If this tag verification fails, this operation MUST immediately halt and fail.

If the input encrypted message is being [streamed](streaming.md) to this operation:

- A streamed Decrypt operation SHOULD release the parsed [encryption context](#encryption-context),
  [algorithm suite ID](../data-format/message-header.md#algorithm-suite-id),
  and [other header information](#parsed-header)
  as soon as tag verification succeeds.
  However, if the streamed Decrypt operation is using an algorithm suite with a signature algorithm
  all released output MUST NOT be considered signed data until
  this operation successfully completes.
  See [security considerations](#security-considerations) below.
- The streamed Decrypt operation SHOULD input the serialized header to the signature algorithm as soon as it is deserialized,
  such that the serialized header isn't required to remain in memory to [verify the signature](#verify-the-signature).

### Decrypt the message body

Regular frame deserialization MUST conform to the [Regular Frame](../data-format/message-body.md#regular-frame) specification.
Final frame deserialization MUST conform to the [Final Frame](../data-format/message-body.md#final-frame) specification.
nonframed data deserialization MUST conform to the [nonframed Data](../data-format/message-body.md#nonframed-data) specification.

Once the message header is successfully parsed, the next sequential bytes
MUST be deserialized according to the [message body spec](../data-format/message-body.md).

If there could still be message body left to deserialize and decrypt,
this operation MUST either wait for more of the encrypted message bytes to become consumable,
wait for the end to the encrypted message to be indicated,
or deserialize and/or decrypt the consumable bytes.

The Decrypt operation MUST use the [content type](../data-format/message-header.md#content-type) field parsed from the
message header to determine whether the operation will deserialize the message bytes as
[framed data](../data-format/message-body.md#framed-data) or
[nonframed data](../data-format/message-body.md#nonframed-data).

If deserializing [framed data](../data-format/message-body.md#framed-data),
the Decrypt operation MUST use the first 4 bytes of a frame to determine
whether the operation will deserialize the frame as a [final frame](../data-format/message-body.md#final-frame)
or [regular frame](../data-format/message-body.md#regular-frame).

The Decrypt operation MUST inspect the first 4 bytes of each frame.
  If the first 4 bytes have a value of 0xFFFFFFFF,
  the Decrypt operation MUST treat them as the [Sequence Number End](../data-format/message-body.md#sequence-number-end)
  and deserialize the following bytes according to the [final frame spec](../data-format/message-body.md#final-frame).
  Otherwise, the Decrypt operation MUST treat them as the [Sequence Number](../data-format/message-body.md#regular-frame-sequence-number)
  and deserialize the following bytes according to the [regular frame spec](../data-format/message-body.md#regular-frame).

For a regular frame, each field MUST be deserialized according to its specification:

- The Decrypt operation MUST deserialize the [Sequence Number](../data-format/message-body.md#regular-frame-sequence-number).
- The Decrypt operation MUST deserialize the [IV](../data-format/message-body.md#regular-frame-iv).
- The Decrypt operation MUST deserialize the [Encrypted Content](../data-format/message-body.md#regular-frame-encrypted-content).
- The Decrypt operation MUST deserialize the [Authentication Tag](../data-format/message-body.md#regular-frame-authentication-tag).

For a final frame, each field MUST be deserialized according to its specification:

- The Decrypt operation MUST deserialize the [Sequence Number End](../data-format/message-body.md#sequence-number-end).
  The value MUST be `0xFFFFFFFF`.
- The Decrypt operation MUST deserialize the [Sequence Number](../data-format/message-body.md#final-frame-sequence-number).
- The Decrypt operation MUST deserialize the [IV](../data-format/message-body.md#final-frame-iv).
- The Decrypt operation MUST deserialize the [Encrypted Content Length](../data-format/message-body.md#final-frame-encrypted-content-length).
  The Decrypt operation MUST ensure that the length of the encrypted content field is
  less than or equal to the frame length deserialized in the message header.
- The Decrypt operation MUST deserialize the [Encrypted Content](../data-format/message-body.md#final-frame-encrypted-content).
- The Decrypt operation MUST deserialize the [Authentication Tag](../data-format/message-body.md#final-frame-authentication-tag).

Once at least a single frame is deserialized (or the entire body in the nonframed case),
the Decrypt operation MUST decrypt and authenticate the frame (or body) using the
[authenticated encryption algorithm](../framework/algorithm-suites.md#encryption-algorithm)
specified by the [algorithm suite](../framework/algorithm-suites.md), with the following inputs:

- The AAD MUST be the serialized [message body AAD](../data-format/message-body-aad.md),
  constructed according to the [Message Body AAD](../data-format/message-body-aad.md) specification, as follows:
  - The [message ID](../data-format/message-body-aad.md#message-id) MUST be the same as the
    [message ID](../data-format/message-header.md#message-id) deserialized from the header of this message.
  - The [Body AAD Content](../data-format/message-body-aad.md#body-aad-content) MUST be constructed
    according to [Message Body AAD](../data-format/message-body-aad.md) depending on
    whether the bytes being decrypted are a regular frame, final frame, or nonframed data.
  - The [sequence number](../data-format/message-body-aad.md#sequence-number) MUST be the sequence
    number deserialized from the frame being decrypted.
    If this is nonframed data, this value MUST be 1.
    If this is framed data and the first frame sequentially, this value MUST be 1.
    Otherwise, this value MUST be 1 greater than the value of the sequence number
    of the previous frame.
  - The [content length](../data-format/message-body-aad.md#content-length) MUST have a value
    equal to the length of the plaintext that was encrypted.
    If this is a regular frame, this SHOULD be determined by using the [frame length](../data-format/message-header.md#frame-length)
    deserialized from the message header.
    If this is a final frame, this SHOULD be determined by using the [final frame encrypted content length](../data-format/message-body.md#final-frame-encrypted-content-length).
    If this is nonframed data, this SHOULD be determined by using the [nonframed data encrypted content length](../data-format/message-body.md#nonframed-data-encrypted-content-length).
- The IV MUST be the [sequence number](../data-format/message-body-aad.md#sequence-number)
  used in the message body AAD above,
  padded to the [IV length](../data-format/message-header.md#iv-length) with 0.
- The cipherkey MUST be the derived data key
- The ciphertext MUST be the encrypted content deserialized from the frame or body.
  For a regular frame this is the [Regular Frame Encrypted Content](../data-format/message-body.md#regular-frame-encrypted-content).
  For a final frame this is the [Final Frame Encrypted Content](../data-format/message-body.md#final-frame-encrypted-content).
  For nonframed data this is the [nonframed Data Encrypted Content](../data-format/message-body.md#nonframed-data-encrypted-content).
- The tag MUST be the authentication tag deserialized from the frame or body.
  For a regular frame this is the [Regular Frame Authentication Tag](../data-format/message-body.md#regular-frame-authentication-tag).
  For a final frame this is the [Final Frame Authentication Tag](../data-format/message-body.md#final-frame-authentication-tag).
  For nonframed data this is the [nonframed Data Authentication Tag](../data-format/message-body.md#nonframed-data-authentication-tag).

If this decryption fails, this operation MUST immediately halt and fail.
This operation MUST NOT release any unauthenticated plaintext.

If the input encrypted message is being [streamed](streaming.md) to this operation:

- If the streamed Decrypt operation is using an algorithm suite without a signature algorithm,
  plaintext SHOULD be released as soon as the above calculation, including tag verification,
  succeeds.
- If the streamed Decrypt operation is using an algorithm suite with a signature algorithm,
  all plaintext decrypted from regular frames SHOULD be released as soon as the above calculation,
  including tag verification, succeeds.
  Any plaintext decrypted from [unframed data](../data-format/message-body.md#nonframed-data) or
  a final frame in a streamed Decrypt operation MUST NOT be released until [signature verification](#verify-the-signature)
  successfully completes.
- The streamed Decrypt operation SHOULD input the serialized frame to the signature algorithm as soon as it is deserialized,
  such that the serialized frame isn't required to remain in memory to complete
  the [signature verification](#verify-the-signature).

### Verify the signature

If the algorithm suite has a signature algorithm,
the Decrypt operation MUST verify the message footer using the specified signature algorithm.

After deserializing the body, the Decrypt operation MUST deserialize the next encrypted message bytes
as the [message footer](../data-format/message-footer.md).

The order for message footer deserialization MUST conform to the [Message Footer](../data-format/message-footer.md) specification.

If there are not enough consumable bytes to deserialize the message footer and
the caller has not yet indicated an end to the encrypted message,
the Decrypt operation MUST wait for enough bytes to become consumable or for the caller
to indicate an end to the encrypted message.

Once the message footer is deserialized, the Decrypt operation MUST use the
[signature algorithm](../framework/algorithm-suites.md#signature-algorithm)
from the [algorithm suite](../framework/algorithm-suites.md) in the decryption materials to
verify the encrypted message, with the following inputs:

- The verification key MUST be the [verification key](../framework/structures.md#verification-key)
  in the decryption materials.
- The input to verify MUST be the concatenation of the serialization of the
  [message header](../data-format/message-header.md) and [message body](../data-format/message-body.md).

Note that the message header and message body could have already been input during previous steps.

If this verification is not successful, this operation MUST immediately halt and fail.

## Security Considerations

If this operation is [streaming](streaming.md) output to the caller
and is decrypting messages created with an algorithm suite including a signature algorithm,
any released plaintext MUST NOT be considered signed data until this operation finishes
successfully.

This means that callers that process such released plaintext MUST NOT consider any processing successful
until this operation completes successfully.
Additionally, if this operation fails, callers MUST discard the released plaintext and encryption context
and MUST rollback any processing done due to the released plaintext or encryption context.

## Appendix

### Nonframed Message Body Decryption

If a message has the [nonframed](../data-format/message-body.md#nonframed-data) content type,
the Decrypt operation MUST deserialize the message body according to the
[nonframed data specification](../data-format/message-body.md#nonframed-data)
and decrypt it using the [authenticated encryption algorithm](../framework/algorithm-suites.md#encryption-algorithm)
specified by the [algorithm suite](../framework/algorithm-suites.md), with the following inputs:

- The IV MUST be the [IV](../data-format/message-body.md#nonframed-data-iv) deserialized from the message body.
- The ciphertext MUST be the [Encrypted Content](../data-format/message-body.md#nonframed-data-encrypted-content) deserialized from the message body.
- The cipherkey MUST be the derived data key.
- The tag MUST be the [Authentication Tag](../data-format/message-body.md#nonframed-data-authentication-tag) deserialized from the message body.
- The AAD MUST be the serialized [message body AAD](../data-format/message-body-aad.md),
  constructed with:
  - The [Body AAD Content](../data-format/message-body-aad.md#body-aad-content) MUST use the value for
    [nonframed data](../data-format/message-body-aad.md#body-aad-content).
  - The [sequence number](../data-format/message-body-aad.md#sequence-number) MUST be `1`.
  - The [content length](../data-format/message-body-aad.md#content-length) MUST equal the length of the plaintext.

If this decryption fails, this operation MUST immediately halt and fail.
