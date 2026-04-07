[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Encrypt

## Overview

This document describes the behavior by which a plaintext is encrypted and serialized into a [message](../data-format/message.md).

## Input

Required arguments:

- The input to the Encrypt operation MUST accept a required [plaintext](#plaintext) argument.
- The input to the Encrypt operation MUST accept a [cryptographic Materials Manager (CMM)](../framework/cmm-interface.md) and a [keyring](../framework/keyring-interface.md) argument.
  The keyring and CMM inputs SHOULD be optional.
  The Encrypt operation MUST validate that exactly one keyring or CMM was provided by the caller.
  If the caller does not provide exactly one of a keyring or CMM, the Encrypt operation MUST fail.

Optional arguments:

- The input to the Encrypt operation MUST accept an optional [Algorithm Suite](#algorithm-suite) argument.
- The input to the Encrypt operation MUST accept an optional [Encryption Context](#encryption-context) argument.
- The input to the Encrypt operation MUST accept an optional [Frame Length](#frame-length) argument.

If the [plaintext](#plaintext) is of unknown length, the caller MAY also input a
[Plaintext Length Bound](#plaintext-length-bound).

Implementations SHOULD ensure that a caller is not able to specify both a [plaintext](#plaintext)
with known length and a [Plaintext Length Bound](#plaintext-length-bound) by construction.
If a caller is able to specify both an input [plaintext](#plaintext) with known length and
a [Plaintext Length Bound](#plaintext-length-bound),
the [Plaintext Length Bound](#plaintext-length-bound) MUST NOT be used during the Encrypt operation
and MUST be ignored.

### Plaintext

The plaintext to encrypt.
This MUST be a sequence of bytes.

This input MAY be [streamed](streaming.md) to this operation.

If an implementation requires holding the input entire plaintext in memory in order to perform this operation,
that implementation SHOULD NOT provide an API that allows this input to be streamed.

### Encryption Context

See [encryption context](../framework/structures.md#encryption-context).

The prefix `aws-crypto-` is reserved for internal use by the AWS Encryption SDK;
see the [the Default CMM spec](default-cmm.md) for one such use.
If the input encryption context contains any entries with a key beginning with `aws-crypto-`,
the encryption operation MUST fail.

### CMM

A CMM that implements the [CMM interface](../framework/cmm-interface.md).

### Keyring

A Keyring that implements the [keyring interface](../framework/keyring-interface.md).

### Algorithm Suite

The [algorithm suite](../framework/algorithm-suites.md) that MUST be used for encryption.
This algorithm suite MUST be [supported for the ESDK](../framework/algorithm-suites.md#supported-algorithm-suites-enum).

### Frame Length

The [frame length](../data-format/message-header.md#frame-length) to use for [framed data](../data-format/message-body.md).
This value MUST be greater than 0 and MUST NOT exceed the value 2^32 - 1.
This value MUST default to 4096 bytes.

### Plaintext Length Bound

A bound on the length of [plaintext](#plaintext) with an unknown length to encrypt.

If this input is provided, this operation MUST NOT encrypt a plaintext with length
greater than this value.

## Output

- The output of the Encrypt operation MUST include an [encrypted message](#encrypted-message) value.
- The output of the Encrypt operation MUST include an [encryption context](#encryption-context) value.
- The output of the Encrypt operation MUST include an [algorithm suite](#algorithm-suite) value.
- The output of the Encrypt operation SHOULD include a [Parsed Header](#parsed-header) value.

### Encrypted Message

An encrypted form of the input [plaintext](#plaintext),
encrypted according to the [behavior specified below](#behavior).
This MUST be a sequence of bytes
and conform to the [message format specification](../data-format/message.md).

This operation MAY [stream](streaming.md) the encrypted message.

### Encryption Context

The [encryption context](../framework/structures.md#encryption-context) that is used as
additional authenticated data during the encryption of the input [plaintext](#plaintext).

This output MAY be satisfied by outputting a [parsed header](#parsed-header) containing this value.

### Algorithm Suite

The [algorithm suite](../framework/algorithm-suites.md) that is used to encrypt
the input [plaintext](#plaintext).

This algorithm suite MUST be [supported for the ESDK](../framework/algorithm-suites.md#supported-algorithm-suites-enum).

This output MAY be satisfied by outputting a [parsed header](#parsed-header) containing this value.

### Parsed Header

A collection of deserialized fields of the [encrypted message's](#encrypted-message) header.

## Behavior

The Encrypt operation is divided into several distinct steps:

- Encrypt operation Step 1 MUST be [Get the encryption materials](#get-the-encryption-materials)
- Encrypt operation step 2 MUST be [Construct the header](#construct-the-header)
- Encrypt operation step 3 MUST be [Construct the body](#construct-the-body)
- Encrypt operation step 4 MUST be [Construct the signature](#construct-the-signature)
  - If the [encryption materials gathered](#get-the-encryption-materials) has a algorithm suite
    including a [signature algorithm](../framework/algorithm-suites.md#signature-algorithm),
    the Encrypt operation MUST perform this step.
  - If the materials do not have an algorithm suite including a signature algorithm,
    the Encrypt operation MUST NOT construct a signature.

These steps calculate and serialize the components of the output [encrypted message](#encrypted-message).
Any data that is not specified within the [message format](../data-format/message.md)
MUST NOT be added to the output message.

If any of these steps fails, this operation MUST halt and indicate a failure to the caller.

### Get the encryption materials

If an [input algorithm suite](#algorithm-suite) is provided
that is not supported by the [commitment policy](client.md#commitment-policy)
configured in the [client](client.md) encrypt MUST yield an error.

To construct the [encrypted message](#encrypted-message),
some fields MUST be constructed using information obtained
from a set of valid [encryption materials](../framework/structures.md#encryption-materials).
This operation MUST obtain this set of [encryption materials](../framework/structures.md#encryption-materials)
by calling [Get Encryption Materials](../framework/cmm-interface.md#get-encryption-materials) on a [CMM](../framework/cmm-interface.md).
The CMM used MUST be the input CMM, if supplied.
If instead the caller supplied a [keyring](../framework/keyring-interface.md),
this behavior MUST use a [default CMM](../framework/default-cmm.md)
constructed using the caller-supplied keyring as input.
The call to [Get Encryption Materials](../framework/cmm-interface.md#get-encryption-materials)
on that CMM MUST be constructed as follows:

- Encryption Context: If provided, this MUST be the [input encryption context](#encryption-context).
  Otherwise, this MUST be an empty encryption context.
- Commitment Policy: This MUST be the [commitment policy](client.md#commitment-policy) configured in the [client](client.md) exposing this encrypt function.
- Algorithm Suite: If provided, this MUST be the [input algorithm suite](#algorithm-suite).
  If no Algorithm Suite is provided, this field MUST NOT be included.
- Max Plaintext Length: If the [input plaintext](#plaintext) has known length,
  this length MUST be used.
  If the input [plaintext](#plaintext) has unknown length and a [Plaintext Length Bound](#plaintext-length-bound)
  was provided, this MUST be the [Plaintext Length Bound](#plaintext-length-bound).
  If no Plaintext Length Bound is provided, this field MUST NOT be included.

The [algorithm suite](../framework/algorithm-suites.md) used in all aspects of this operation
MUST be the algorithm suite in the [encryption materials](../framework/structures.md#encryption-materials)
returned from the [Get Encryption Materials](../framework/cmm-interface.md#get-encryption-materials) call.
Note that the algorithm suite in the retrieved encryption materials MAY be different
from the [input algorithm suite](#algorithm-suite).
If this algorithm suite is not [supported for the ESDK](../framework/algorithm-suites.md#supported-algorithm-suites-enum)
encrypt MUST yield an error.
If this [algorithm suite](../framework/algorithm-suites.md) is not supported by the [commitment policy](client.md#commitment-policy)
configured in the [client](client.md) encrypt MUST yield an error.
If the number of [encrypted data keys](../framework/structures.md#encrypted-data-keys) on the [encryption materials](../framework/structures.md#encryption-materials)
is greater than the [maximum number of encrypted data keys](client.md#maximum-number-of-encrypted-data-keys) configured in the [client](client.md) encrypt MUST yield an error.

The data key used as input for all encryption described below MUST be a data key derived from the plaintext data key
included in the [encryption materials](../framework/structures.md#encryption-materials).
The algorithm used to derive a data key from the plaintext data key MUST be
the [key derivation algorithm](../framework/algorithm-suites.md#key-derivation-algorithm) included in the
[algorithm suite](../framework/algorithm-suites.md) defined above.
This document refers to the output of the key derivation algorithm as the derived data key.
Note:

- If the key derivation algorithm is the [identity KDF](../framework/algorithm-suites.md#identity-kdf),
  then the derived data key MUST be the same as the plaintext data key.
- If the key derivation algorithm is [HKDF](../framework/algorithm-suites.md#hkdf),
  the derivation process used MUST be the process described in [HKDF Encryption Key](../transitive-requirements.md#hkdf-encryption-key).

The frame length used in the procedures described below MUST be the input [frame length](#frame-length),
if supplied.
If no input frame length is supplied, the default frame length MUST be used.

### Construct the header

Before encrypting input plaintext,
this operation MUST serialize the [message header body](../data-format/message-header.md).
The [message format version](../data-format/message-header.md#supported-versions) MUST be the value associated with the [algorithm suite](../framework/algorithm-suites.md#supported-algorithm-suites).

#### V2 Header

If the message format version associated with the [algorithm suite](../framework/algorithm-suites.md#supported-algorithm-suites) is 2.0
then the [message header body](../data-format/message-header.md#header-body-version-2-0) MUST be serialized with the following specifics:

- [Version](../data-format/message-header.md#version): MUST be serialized according to the
  [Version](../data-format/message-header.md#version) specification.
  The value MUST correspond to [2.0](../data-format/message-header.md#supported-versions).
- [Algorithm Suite ID](../data-format/message-header.md#algorithm-suite-id): MUST be serialized according to the
  [Algorithm Suite ID](../data-format/message-header.md#algorithm-suite-id) specification.
  The value MUST correspond to the [algorithm suite](../framework/algorithm-suites.md) used in this behavior.
- [Message ID](../data-format/message-header.md#message-id): MUST be serialized according to the
  [Message ID](../data-format/message-header.md#message-id) specification.
  The process used to generate this identifier MUST use a good source of randomness
  to make the chance of duplicate identifiers negligible.
- [AAD](../data-format/message-header.md#aad): MUST be serialized according to the
  [AAD](../data-format/message-header.md#aad) specification.
  The value MUST be the serialization of the [encryption context](../framework/structures.md#encryption-context)
  in the [encryption materials](../framework/structures.md#encryption-materials),
  and this serialization MUST NOT contain any key value pairs listed in
  the [encryption material's](../framework/structures.md#encryption-materials)
  [required encryption context keys](../framework/structures.md#required-encryption-context-keys).
- [Encrypted Data Keys](../data-format/message-header.md#encrypted-data-keys): MUST be serialized according to the
  [Encrypted Data Keys](../data-format/message-header.md#encrypted-data-keys) specification.
  The value MUST be the serialization of the
  [encrypted data keys](../framework/structures.md#encrypted-data-keys) in the [encryption materials](../framework/structures.md#encryption-materials).
- [Content Type](../data-format/message-header.md#content-type): MUST be serialized according to the
  [Content Type](../data-format/message-header.md#content-type) specification.
  The value MUST be [02](../data-format/message-header.md#supported-content-types).
- [Frame Length](../data-format/message-header.md#frame-length): MUST be serialized according to the
  [Frame Length](../data-format/message-header.md#frame-length) specification.
  The value MUST be the value of the frame size determined above.
- [Algorithm Suite Data](../data-format/message-header.md#algorithm-suite-data): MUST be serialized according to the
  [Algorithm Suite Data](../data-format/message-header.md#algorithm-suite-data) specification.
  The value MUST be the value of the [commit key](../framework/algorithm-suites.md#commit-key)
  derived according to the [algorithm suites commit key derivation settings](../framework/algorithm-suites.md#algorithm-suites-commit-key-derivation-settings).

The serialization order MUST follow the [Header Body Version 2.0](../data-format/message-header.md#header-body-version-20) specification.

#### V1 Header

If the message format version associated with the [algorithm suite](../framework/algorithm-suites.md#supported-algorithm-suites) is 1.0
then the [message header body](../data-format/message-header.md#header-body-version-10) MUST be serialized with the following specifics:

- [Version](../data-format/message-header.md#version): MUST be serialized according to the
  [Version](../data-format/message-header.md#version) specification.
  The value MUST correspond to [1.0](../data-format/message-header.md#supported-versions).
- [Type](../data-format/message-header.md#type): MUST be serialized according to the
  [Type](../data-format/message-header.md#type) specification.
  The value MUST correspond to [Customer Authenticated Encrypted Data](../data-format/message-header.md#supported-types).
- [Algorithm Suite ID](../data-format/message-header.md#algorithm-suite-id): MUST be serialized according to the
  [Algorithm Suite ID](../data-format/message-header.md#algorithm-suite-id) specification.
  The value MUST correspond to the [algorithm suite](../framework/algorithm-suites.md) used in this behavior.
- [Message ID](../data-format/message-header.md#message-id): MUST be serialized according to the
  [Message ID](../data-format/message-header.md#message-id) specification.
  The process used to generate this identifier MUST use a good source of randomness
  to make the chance of duplicate identifiers negligible.
- [AAD](../data-format/message-header.md#aad): MUST be serialized according to the
  [AAD](../data-format/message-header.md#aad) specification.
  The value MUST be the serialization of the [encryption context](../framework/structures.md#encryption-context)
  in the [encryption materials](../framework/structures.md#encryption-materials),
  and this serialization MUST NOT contain any key value pairs listed in
  the [encryption material's](../framework/structures.md#encryption-materials)
  [required encryption context keys](../framework/structures.md#required-encryption-context-keys).
- [Encrypted Data Keys](../data-format/message-header.md#encrypted-data-keys): MUST be serialized according to the
  [Encrypted Data Keys](../data-format/message-header.md#encrypted-data-keys) specification.
  The value MUST be the serialization of the
  [encrypted data keys](../framework/structures.md#encrypted-data-keys) in the [encryption materials](../framework/structures.md#encryption-materials).
- [Content Type](../data-format/message-header.md#content-type): MUST be serialized according to the
  [Content Type](../data-format/message-header.md#content-type) specification.
  The value MUST be [02](../data-format/message-header.md#supported-content-types).
- [Reserved](../data-format/message-header.md#reserved): MUST be serialized according to the
  [Reserved](../data-format/message-header.md#reserved) specification.
- [IV Length](../data-format/message-header.md#iv-length): MUST be serialized according to the
  [IV Length](../data-format/message-header.md#iv-length) specification.
  The value MUST match the [IV length](../framework/algorithm-suites.md#iv-length)
  specified by the [algorithm suite](../framework/algorithm-suites.md).
- [Frame Length](../data-format/message-header.md#frame-length): MUST be serialized according to the
  [Frame Length](../data-format/message-header.md#frame-length) specification.
  The value MUST be the value of the frame size determined above.

The serialization order MUST follow the [Header Body Version 1.0](../data-format/message-header.md#header-body-version-10) specification.

#### Authentication Tag

After serializing the message header body,
this operation MUST calculate an [authentication tag](../data-format/message-header.md#authentication-tag)
over the message header body.
The value of this MUST be the output of the [authenticated encryption algorithm](../framework/algorithm-suites.md#encryption-algorithm)
specified by the [algorithm suite](../framework/algorithm-suites.md), with the following inputs:

- The AAD MUST be the concatenation of the serialized [message header body](../data-format/message-header.md#header-body)
  and the serialization of encryption context to only authenticate.
  The encryption context to only authenticate MUST be the [encryption context](../framework/structures.md#encryption-context)
  in the [encryption materials](../framework/structures.md#encryption-materials)
  filtered to only contain key value pairs listed in
  the [encryption material's](../framework/structures.md#encryption-materials)
  [required encryption context keys](../framework/structures.md#required-encryption-context-keys)
  serialized according to the [encryption context serialization specification](../framework/structures.md#serialization).
- The IV MUST have a value of 0.
- The cipherkey MUST be the derived data key
- The plaintext MUST be an empty byte array

The serialized bytes MUST NOT be released until the entire message header has been serialized.
If this operation is streaming the encrypted message and
the entire message header has been serialized,
the serialized message header MUST be released.

The encrypted message output by the Encrypt operation MUST have a message header equal
to the message header calculated in this step.
If the message headers are not equal, the Encrypt operation MUST fail.

If the algorithm suite contains a signature algorithm and
this operation is [streaming](streaming.md) the encrypted message output to the caller,
this operation MUST input the serialized header to the signature algorithm as soon as it is serialized,
such that the serialized header isn't required to remain in memory to [construct the signature](#construct-the-signature).

#### V2 Authentication Tag

With the authentication tag calculated,
if the message format version associated with the [algorithm suite](../framework/algorithm-suites.md#supported-algorithm-suites) is 2.0,
this operation MUST serialize the [message header authentication](../data-format/message-header.md#header-authentication-version-2-0) with the following specifics:

- [Authentication Tag](../data-format/message-header.md#authentication-tag): MUST have the value
  of the authentication tag calculated above.

#### V1 Authentication Tag

With the authentication tag calculated,
if the message format version associated with the [algorithm suite](../framework/algorithm-suites.md#supported-algorithm-suites) is 1.0
this operation MUST serialize the [message header authentication](../data-format/message-header.md#header-authentication-version-1-0) with the following specifics:

- [IV](../data-format/message-header.md#iv): MUST have the value of the IV used in the calculation above,
  padded to the [IV length](../data-format/message-header.md#iv-length) with 0.
- [Authentication Tag](../data-format/message-header.md#authentication-tag): MUST have the value
  of the authentication tag calculated above.

## Construct the body

Regular frame serialization MUST conform to the [Regular Frame](../data-format/message-body.md#regular-frame) specification.
Final frame serialization MUST conform to the [Final Frame](../data-format/message-body.md#final-frame) specification.

The encrypted message output by the Encrypt operation MUST have a message body equal
to the message body calculated in this step.
If the message bodies are not equal, the Encrypt operation MUST fail.

If [Plaintext Length Bound](#plaintext-length-bound) was specified on input
and this operation determines at any time that the plaintext being encrypted
has a length greater than this value,
this operation MUST immediately fail.

Before the end of the input is indicated,
this operation MUST process as much of the consumable bytes as possible
by [constructing regular frames](#construct-a-frame).

When the end of the input is indicated,
this operation MUST perform the following until all consumable plaintext bytes are processed:

- If there are exactly enough consumable plaintext bytes to create one regular frame,
  such that creating a regular frame processes all consumable bytes,
  then this operation MUST [construct either a final frame or regular frame](#construct-a-frame)
  with the remaining plaintext.
- If there are enough input plaintext bytes consumable to create a new regular frame,
  such that creating a regular frame does not processes all consumable bytes,
  then this operation MUST [construct a regular frame](#construct-a-frame)
  using the consumable plaintext bytes.
- If there are not enough input consumable plaintext bytes to create a new regular frame,
  then this operation MUST [construct a final frame](#construct-a-frame)

If an end to the input has been indicated, there are no more consumable plaintext bytes to process,
and a final frame has not yet been constructed,
this operation MUST [construct an empty final frame](#construct-a-frame).

### Construct a frame

To construct a regular or final frame that represents the next frame in the encrypted message's body,
the Encrypt operation MUST calculate the encrypted content and an authentication tag using the
[authenticated encryption algorithm](../framework/algorithm-suites.md#encryption-algorithm)
specified by the [algorithm suite](../framework/algorithm-suites.md),
with the following inputs:

- The AAD MUST be the serialized [message body AAD](../data-format/message-body-aad.md),
  constructed according to the [Message Body AAD](../data-format/message-body-aad.md) specification, as follows:
  - The [message ID](../data-format/message-body-aad.md#message-id) MUST be the same as the
    [message ID](../data-format/message-header.md#message-id) serialized in the header of this message.
  - The [Body AAD Content](../data-format/message-body-aad.md#body-aad-content) MUST be the structure defined in
    [Message Body AAD](../data-format/message-body-aad.md).
  - The [sequence number](../data-format/message-body-aad.md#sequence-number) MUST be the sequence
    number of the frame being encrypted.
    If this is the first frame sequentially, the sequence number value MUST be 1.
    Otherwise, the sequence number value MUST be 1 greater than the value of the sequence number
    of the previous frame.
  - The [content length](../data-format/message-body-aad.md#content-length) MUST have a value
    equal to the length of the plaintext being encrypted.
    - For a regular frame the length of this plaintext MUST equal the frame length.
    - For a final frame this MUST be the length of the remaining plaintext bytes
      which have not yet been encrypted,
      whose length MUST be equal to or less than the frame length.
- The IV MUST be the [sequence number](../data-format/message-body-aad.md#sequence-number)
  used in the message body AAD for this frame,
  padded to the [IV length](../data-format/message-header.md#iv-length).
- The cipherkey MUST be the derived data key
- The plaintext MUST be the next subsequence of consumable plaintext bytes that have not yet been encrypted.
  - For a regular frame the length of this plaintext subsequence MUST equal the frame length.
  - For a final frame this MUST be the remaining plaintext bytes which have not yet been encrypted,
    whose length MUST be equal to or less than the frame length.

The Encrypt operation MUST serialize a regular frame or final frame with the following specifics:

For a regular frame, the serialization MUST follow the [Regular Frame](../data-format/message-body.md#regular-frame) specification.
For a final frame, the serialization MUST follow the [Final Frame](../data-format/message-body.md#final-frame) specification.

- [Sequence Number End](../data-format/message-body.md#sequence-number-end): MUST be serialized according to the
  [Sequence Number End](../data-format/message-body.md#sequence-number-end) specification.
  The Sequence Number End MUST only be serialized for the final frame.
- [Sequence Number](../data-format/message-body.md#regular-frame-sequence-number): MUST be serialized according to the
  [Regular Frame Sequence Number](../data-format/message-body.md#regular-frame-sequence-number) specification.
  The value MUST be the sequence number of this frame.
- [IV](../data-format/message-body.md#regular-frame-iv): MUST be serialized according to the
  [Regular Frame IV](../data-format/message-body.md#regular-frame-iv) specification.
  The value MUST be the IV used when calculating the encrypted content for this frame.
- [Encrypted Content Length](../data-format/message-body.md#final-frame-encrypted-content-length): MUST be serialized according to the
  [Final Frame Encrypted Content Length](../data-format/message-body.md#final-frame-encrypted-content-length) specification.
  The Encrypted Content Length MUST only be serialized for the final frame.
- [Encrypted Content](../data-format/message-body.md#regular-frame-encrypted-content): MUST be serialized according to the
  [Regular Frame Encrypted Content](../data-format/message-body.md#regular-frame-encrypted-content) specification.
  The value MUST be the encrypted content calculated for this frame.
- [Authentication Tag](../data-format/message-body.md#regular-frame-authentication-tag): MUST be serialized according to the
  [Regular Frame Authentication Tag](../data-format/message-body.md#regular-frame-authentication-tag) specification.
  The value MUST be the authentication tag output when calculating the encrypted content for this frame.

The serialized frame bytes MUST NOT be released until the entire frame has been serialized.
If the Encrypt operation is streaming the encrypted message and
the entire frame has been serialized,
the serialized frame MUST be released.

If the algorithm suite contains a signature algorithm and
the Encrypt operation is [streaming](streaming.md) the encrypted message output to the caller,
the Encrypt operation MUST input the serialized frame to the signature algorithm as soon as it is serialized,
such that the serialized frame isn't required to remain in memory to [construct the signature](#construct-the-signature).

### Construct the signature

If the [algorithm suite](../framework/algorithm-suites.md) contains a [signature algorithm](../framework/algorithm-suites.md#signature-algorithm),
this operation MUST calculate a signature over the message,
and the output [encrypted message](#encrypted-message) MUST contain a [message footer](../data-format/message-footer.md).

To calculate a signature, this operation MUST use the [signature algorithm](../framework/algorithm-suites.md#signature-algorithm)
specified by the [algorithm suite](../framework/algorithm-suites.md), with the following input:

- the signature key MUST be the [signing key](../framework/structures.md#signing-key) in the [encryption materials](../framework/structures.md#encryption-materials)
- the input to sign MUST be the concatenation of the serialization of the [message header](../data-format/message-header.md) and [message body](../data-format/message-body.md)

Note that the message header and message body MAY have already been input during previous steps.

This operation MUST then serialize a message footer with the following specifics:

- [Signature Length](../data-format/message-footer.md#signature-length): MUST be the length of the
  output of the calculation above.
- [Signature](../data-format/message-footer.md#signature): MUST be the output of the calculation above.

The order for message footer serialization MUST conform to the [Message Footer](../data-format/message-footer.md) specification.

The above serialized bytes MUST NOT be released until the entire message footer has been serialized.
Once the entire message footer has been serialized,
this operation MUST release any previously unreleased serialized bytes from previous steps
and MUST release the message footer.

The encrypted message output by this operation MUST have a message footer equal
to the message footer calculated in this step.

## Appendix

### Un-Framed Message Body Encryption

Implementations of the AWS Encryption SDK MUST NOT encrypt using the Non-Framed content type.

### Encryption Context not stored in the message

The encryption context to only authenticate is backwards compatible
with older messages because the [encryption context serialization specification](../framework/structures.md#serialization)
will serialize an empty encryption context as 0 bytes.
