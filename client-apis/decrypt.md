[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Decrypt

## Version

0.2.0

## Changlog

- 0.2.0

  - [Clarify Streaming Encrypt and Decrypt](../changes/2020-07-06_clarify-streaming-encrypt-decrypt/change.md)

- 0.1.0-preview

  - Initial record

## Implementations

- [C](https://github.com/aws/aws-encryption-sdk-c/blob/master/source/session_decrypt.c)
- [Java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/internal/DecryptionHandler.java)
- [JSNode](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/decrypt-node/src/decrypt.ts)
- [Browser JS](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/decrypt-browser/src/decrypt.ts)
- [Python](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/streaming_client.py)

| Language   | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation                                                                                                                                                 |
| ---------- | -------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C          | 0.2.0                                  | 0.1.0                     | [session_decrypt.c](https://github.com/aws/aws-encryption-sdk-c/blob/master/source/session_decrypt.c)                                                          |
| NodeJS     | 0.2.0                                  | 0.1.0                     | [decrypt.ts](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/encrypt-node/src/decrypt.ts)                                         |
| Browser JS | 0.2.0                                  | 0.1.0                     | [decrypt.ts](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/encrypt-browser/src/decrypt.ts)                                      |
| Python     | 0.2.0                                  | 1.2.0                     | [streaming_client.py](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/streaming_client.py)                                 |
| Java       | 0.2.0                                  | 0.0.1                     | [DecryptionHandler.java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/internal/DecryptionHandler.java) |

## Overview

This document describes the operation of decrypting the encrypted message previously received from an encrypt call to the AWS Encryption SDK.
The AWS Encryption SDK provides a client to decrypt the inputted encrypted message, and returns as the output the plaintext.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC2119](https://tools.ietf.org/html/rfc2119).

## Input

The client MUST require the following as inputs to this operation:

- [Encrypted Message](#encrypted-message)

The client MUST require exactly one of the following type of inputs:

- [Cryptographic Materials Manager (CMM)](../framework/cmm-interface.md)
- [Keyring](../framework/keyring-interface.md)

### Encrypted Message

The encrypted message to decrypt.
The encrypted message inputted MUST be a sequence of bytes in the
[message format](../data-format/message.md) specified by the AWS Encryption SDK.
The encrypted message contains the list of [encrypted data keys](../data-format/message-header.md#encrypted-data-keys),
[encryption context](../data-format/message-header.md#aad), if provided during encryption,
[encrypted content](../data-format/message-body.md#encrypted-content) and
[algorithm suite ID](../data-format/message-header.md#algorithm-suite-id) among other metadata.
Each key in the encrypted data key list is an encrypted version of the single plaintext data key that was used to encrypt the plaintext.
The encryption context is the additional authenticated data that was used during encryption.
The algorithm suite ID refers to the algorithm suite used to encrypt the message and is required to decrypt the encrypted message.

The caller MAY stream this sequence of bytes to this operation.

- The caller MAY supply the encrypted message bytes sequentially and temporally to this operation.
- This operation MAY process on any encrypted message supplied thus far.

### Cryptographic Materials Manager

A CMM that implements the [CMM interface](../framework/cmm-interface.md).

This CMM MUST obtain the [decryption materials](../framework/structures.md#decryption-materials) required for decryption.

### Keyring

A Keyring that implements the [keyring interface](../framework/keyring-interface.md).

If the Keyring is provided as the input, the client MUST construct a [default CMM](../framework/default-cmm.md) that uses this keyring,
to obtain the [decryption materials](../framework/structures.md#decryption-materials) that is required for decryption.

This default CMM MUST obtain the decryption materials required for decryption.

## Output

The client MUST return as output to this operation:

- [Plaintext](#plaintext)

### Plaintext

The decrypted data.

This operation MAY stream the plaintext to the caller.

- The operation MAY release the output message sequentially and temporally to the caller.
  - For messages created with an algorithm suite including a signature algorithm,
    any released plaintext MUST NOT be considered verified until this operation finishes
    successfully.
    See [security considerations](#security-considerations) below.
- The operation MUST be able to indicate an end to the released sequential output.

### Encryption Context

The [encryption context](#../framework/structures.md#encryption-context) serialized within
the [encrypted message's](#encrypted-message) [aad field](../data-format/message-header.md#aad).

## Operation

The Decrypt operation is divided into several distinct parts:

- [Parse the header](#parse-the-header)
- [Get the decryption materials](#get-the-decryption-materials)
- [Decrypt the body](#decrypt-the-body)
- [Verify the signature (optional)](#verify-the-signature-optional)

This operation MUST perform these steps in order.

If the caller is streaming the encrypted plaintext to this operation
and indicates an end to the encrypted message such that this operation can
not complete the above steps,
this operation MUST halt and indicate a failure to the caller.

The caller MAY forgoe indicating an end to the encrypted message.
This operation MAY still succeed as long as it can successfully process the first
sequential bytes inputted to it as an encrypted message.

If any of these steps fails, this oepration MUST falt and indicate a failure to the caller.

### Parse the header

Given encrypted message bytes, this operation MUST process those bytes sequentially,
deserializing those bytes according to the [message format](../data-format/message.md).

This operation MUST attempt to deserialize all available encrypted message bytes until it has
successfully deserialized a valid [message header](../data-format/message-header.md).

This operation MUST wait if it doesn't have enough encrypted message bytes available to
deserialize the next field of the message header until enough input bytes become available or
the caller indicates an end to the encrypted message.

Once a valid message header is deserialized,
this operation MUST validate the [message header body](../data-format/message-header.md#header-body)
by using the [authenticated encryption algorithm](../framework/algorithm-suites.md#encryption-algorithm)
to decrypt with the following inputs:

- the AAD is the serialized [message header body](../data-format/message-header.md#header-body).
- the IV has a value of 0
- the cipherkey is the derived data key
- the ciphertext is an empty byte array

If this decryption fails, this operation MUST immediately halt and fail.

If the algorithm suite contains a signature algorithm and
this operation is streaming the plaintext output to the caller,
this operation MUST input the serialized frame to the signature algorithm as soon as it is deserialized,
such that the serialized frame isn't required to remain in memory to complete
the [signature calculation](#signature-calculation).

If this decryption succeeds and the algorithm suite does not contain a signature algorithm,
the parsed [encryption context](#encryption-context) MAY be released to the caller.

If the algorithm suite does contain a signature algorithm
the parsed [encryption context](#encryption-context) MUST NOT be released to the caller until the
[signature is verified](#verify-the-signature-optional).

If streaming the output plaintext for a message with a signature,
the result plaintext MAY be released, however the caller MUST NOT
consider this plaintext verified.
See [security considerations](#security-considerations) below.

### Get the decryption materials

To decrypt the message body, a set of valid decryption materials is required.

This operation MUST obtain this set of [decryption materials](../framework/structures.md#decryption-materials),
by calling [Decrypt Materials](../framework/cmm-interface.md#decrypt-materials) on a [CMM](../framework/cmm-interface.md).

The CMM used MUST be the input CMM, if supplied.
If a CMM is not supplied as the input, the decrypt operation MUST construct a [default CMM](../framework/default-cmm.md)
from the [keyring](../framework/keyring-interface.md) inputted.

The call to CMM's [Decrypt Materials](../framework/cmm-interface.md#decrypt-materials) operation
MUST include as the input the [encryption context](../data-format/message-header.md#aad)
(if the encryption context is empty, this operation MAY pass no encryption context),
the [encrypted data keys](../data-format/message-header.md#encrypted-data-keys), and the
[algorithm suite ID](../data-format/message-header.md#algorithm-suite-id),
obtained from parsing the message header of the encrypted message inputted.

The decryption materials returned by the call to the CMM's Decrypt Materials behaviour MUST contain a valid
[plaintext data key](../framework/structures.md#plaintext-data-key-1),
[algorithm suite](../framework/algorithm-suites.md) and an
[encryption context](../framework/structures.md#encryption-context),
if an encryption context was used during encryption.

Note: This encryption context MUST be the same encryption context that was used
during encryption otherwise the decrypt operation will fail.

The data key used as input for all decryption described below is a data key derived from the plaintext data key
included in the [decryption materials](../framework/structures.md#decryption-materials).
The algorithm used to derive a data key from the plaintext data key MUST be
the [key derivation algorithm](../framework/algorithm-suites.md#key-derivation-algorithm) included in the
[algorithm suite](../framework/algorithm-suites.md) defined above.
This document refers to the output of the key derivation algorithm as the derived data key.
Note that if the key derivation algorithm is the [identity KDF](../framework/algorithm-suites.md#identity-kdf),
then the derived data key is the same as the plaintext data key.

### Decrypt the message body

Once the message header is successfully parsed, the next sequential bytes
MUST be deserialized according to the [message body spec](../data-format/message-body.md).

While there MAY still be message body left to deserialize and decrypt,
this operation MUST either wait for more of the encrypted message to become available,
wait for the caller to indicate an end to the encrypted message,
or to deserialize and/or decrypt the available bytes.

The [content type](../data-format/message-header.md#content-type) field parsed from the
message header above determines whether these bytes MUST be deserialized as
[framed data](../data-format/message-body.md#framed-data) or
[un-framed data](../data-format/message-body.md#un-framed-data).

Once at least a single frame is deserialized (or the entire body in the un-framed case),
this operation MUST decrypt and authenticate the frame (or body) using the
[authenticated encryption algorithm](../framework/algorithm-suites.md#encryption-algorithm)
specified by the [algorithm suite](../framework/algorithm-suites.md), with the following inputs:

- The AAD is the serialized [message body AAD](../data-format/message-body-aad.md),
  constructed as follows:
  - The [message ID](../data-format/message-body-aad.md#message-id) is the same as the
    [message ID](../data-frame/message-header.md#message-id) deserialized from the header of this message.
  - The [Body AAD Content](../data-format/message-body-aad.md#body-aad-content) depends on
    whether the thing being decrypted is a regular frame, final frame, or unframed data.
    Refer to [Message Body AAD](../data-format/message-body-aad.md) specification for more information.
  - The [sequence number](../data-format/message-body-aad.md#sequence-number) is the sequence
    number deserialized from the frame being decrypted.
    If this is unframed-data, this value MUST be 1.
    If this is framed data and the first frame sequentially, this value MUST be 1.
    Otherwise, this value MUST be 1 greater than the value of the sequence number
    of the previous frame.
  - The [content length](../data-format/message-body-aad.md#content-length) MUST have a value
    equal to the length of the plaintext that was encrypted.
    This can be determined by using the [frame length](../data-format/message-header.md#frame-length)
    deserialized from the message header if this is a regular frame,
    or the [encrypted content length](../data-format/message-body.md#encrypted-content-length)
    otherwise.
- The IV is the [sequence number](../data-format/message-body-aad.md#sequence-number)
  used in the message body AAD above.
- The cipherkey is the derived data key
- The ciphertext is the [encrypted content](../data-format/message-body.md#encrypted-content).

If this decryption fails, this operation MUST immediately halt and fail.

If the algorithm suite contains a signature algorithm and
this operation is streaming the plaintext output to the caller,
this operation MUST input the serialized frame to the signature algorithm as soon as it is deserialized,
such that the serialized frame isn't required to remain in memory to complete
the [signature calculation](#signature-calculation).

If the encrypted message includes an algorithm suite without a signature algorithm,
the result plaintext MAY be released.

If the encrypted message includes an algorithm suite with a signature algorithm
the result plaintext MUST NOT be released until [signature verification succeeds](#verify-the-signature-optional).

If streaming the output plaintext for a message with a signature,
the result plaintext MAY be released, however the caller MUST NOT
consider this plaintext verified.
See [security considerations](#security-considerations) below.

### Verify the signature (Optional)

If the algorithm suite has a signature algorithm,
this operation MUST verify the message footer using the specified signature algorithm.

After deserializing the body, this operation MUST deserialize the next encrypted message bytes
as the [message footer](../data-format/message-footer.md).

If there are not enough available bytes to deserialize the message footer and
the caller has not yet indicated an end to the encrypted message,
this operation MUST wait for enough bytes to become available or for the caller
to indicate an end to the encrypted message.

Once the message footer is deserialized, this operation MUST use the
[signature algorithm](../framework/algorithm-suites.md#signature-algorithm)
from the [algorithm suite](../frameowkr/algorithm-suites.md) in the decryption materials to
verify the encrypted message, with the following inputs:

- The verification key is the [verification key](../framework/structures.md#verification-key)
  in the decryption materials.
- The input to verify is the concatenation of the serialization of the
  [message header](../data-format/message-header.md) and [message body](../data-format/message-body.md).

Note that the message header and message body MAY have already been inputted during previous steps.

If this verification is not successful, this operation MUST immediately halt and fail.

## Security Considerations

If this operation is streaming output to the caller
and is decrypting messages created with an algorithm suite including a signature algorithm,
any released plaintext MUST NOT be considered verified until this operation finishes
successfully.

This means that callers that process such released plaintext MUST NOT consider any processing successful
until this operation completes successfully.
Additionally, if this operation fails, callers MUST discard the released plaintext and encryption context
and MUST rollback any processing done due to the released plaintext or encryption context.
