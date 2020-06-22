[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Decrypt Inputs Max Body Size and Max Header Size

## Affected Features

This serves as a reference of all features that this change affects.

| Feature                                 |
| --------------------------------------- |
| [Decrypt](../../client-apis/decrypt.md) |

## Affected Specifications

This serves as a reference of all specification documents that this change affects.

| Specification                           |
| --------------------------------------- |
| [Decrypt](../../client-apis/decrypt.md) |

## Affected Implementations

This serves as a reference for all implementations that this change affects.

| Language   | Repository                                                                            |
| ---------- | ------------------------------------------------------------------------------------- |
| Python     | [aws-encryption-sdk-python](https://github.com/aws/aws-encryption-sdk-python)         |
| Java       | [aws-encryption-sdk-java](https://github.com/aws/aws-encryption-sdk-java)             |
| C          | [aws-encryption-sdk-c](https://github.com/aws/aws-encryption-sdk-c)                   |
| Javascript | [aws-encryption-sdk-javascript](https://github.com/aws/aws-encryption-sdk-javascript) |

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

Processing ESDK messages of unknown size introduces a risk of highly-bounded resource consumption
due to variable length fields in the message format.
This is bad for users that require decrypting such messages,
especially for such users that care about the memory usage of their systems.

Most ESDK implementations currently have a way to mitigate some of these concerns through
user specified controls on the Decrypt operation,
however these controls are not described in our specification,
nor behave consistently across implementations.

This change clearly defines the specification for two inputs,
`Max Body Size` and `Max Header Size`,
on Decrypt which provide a way for users to put more restrictive bounds
on the messages the ESDK will process.

## Out of Scope

- Providing a control that is a 1:1 memory limit on
  what the ESDK requires to hold in memory in order to perform its operations is out of scope.
  The goal is to provide a control that is precise
  (behaves consistently and scales in expected ways),
  not a control that is accurate (closely resembles the actual memory usage of the ESDK).

- Updating the logic of the ESDK to not require holding these various objects
  in memory throughout the duration of the decryption operation is not in scope.

- Additional controls to limit the memory used to process messages with invalid signature lengths
  is out of scope.
  The bounds of the signature length field are still small enough (2^16 bytes)
  that they are not a concern.

## Motivation

ESDK implementations already have some ways of mitigating the highly-bounded resource consumption
of decrypting messages.
However, none of these mitigations behave consistently across implementations,
nor do any of them bound the fields in the message header specifically.

As such, this change proposes two controls to standardize on which are capable of providing
a bound on all variable length fields that can be significantly large.

## Drawbacks

- Requires users to use two controls in order to mitigate all highly-bounded resource consumption
  concerns.
- Requires users to become aware of the message structure,
  and requires them to consider what messages they expect for their use case.

## Security Implications

This change SHOULD NOT have any security implications.

## Operational Implications

This change adds operational controls for putting stricter bounds on some fields of the
message header.
Users who are especially concerned with the memory usage of their systems should consider
setting these controls in order to put a stricter bound on the messages that the ESDK will decrypt.

This change will break JS users who are currently setting `Max Body Size` and are depending on
the behavior that a message with a encrypted content field length of exactly `Max Body Size`
will fail.
With this change, `Max Body Size` is inclusive, such that encryption content fields lengths
of that exact value are allowed.

## Guide-level Explanation

Specify two optional inputs `Max Body Size` and `Max Header Size` for Decrypt.
`Max Body Size` sets a limit on the maximum encryption content length the ESDK will process
in a message,
and `Max Header Size` sets a limit on the maximum header length the ESDK will process in a message.

The intention behind these controls is to provide a way for users to specify a stricter bound
on the lengths of messages the ESDK will process in order to mitigate highly-bounded
resource consumption due to decrypting a large message.

### Why do users care about these controls?

In order to process and decrypt ESDK messages,
the ESDK is allowed to buffer various variable length fields from our message format.
Some of these variable length fields can be large enough such that they
require a significat amount of memory in order to be processed.

The message format contains the following highly-bounded variable length fields:

1.  The Encrypted Content field in an unframed message.
    The message format allows this to be up to 2^64 bytes (16 EiB)
    however in implementation this is actually limited to 2^36 - 32 bytes (~64.7 GB)
    due to restrictions in the algorithm suite.
    For some implementations this is further restricted
    (e.g. Java arrays cannot have more than 2^31 - 1 members).
    In order to decrypt an unframed message,
    the entire Encrypted Content field must be buffered.
    In order to release the plaintext to the user safely,
    both the plaintext and the ciphertext must be held in memory at the same time.
    Assuming an encryption algorithm where the length of the output equals the length of the input,
    this bumps the memory requirement to process this by a factor of 2.
1.  The Encrypted Content field in a frame in a framed message.
    The message format allows this to be up to 2^32 bytes (4 GiB).
    In order to decrypt a frame, the entire Encrypted Content field in that frame must be buffered.
    In order to release the plaintext to the user safely,
    both the plaintext and the ciphertext must be held in memory at the same time.
    Assuming an encryption algorithm where the length of the output equals the length of the input,
    this bumps the memory requirement to process this by a factor of 2.
1.  The Encrypted Data Keys field in the message header.
    The message format allows this to be up to 2^16 _ (6 + 3 _ 2^16) bytes (~12 GiB).
    As such, 12 GiB represents a lower bound on the amount of memory required to
    process the largest EDK set the message format allows.
    The actual memory required will depend on how a specific language and implementation
    is able to represent these objects in memory.
    These objects need to be held in memory for the duration of the decryption operation.

The above represents ways in which a message can become large such that their processing
would exhaust many memory runtime limits.
As such, customers who are concerned with the stability and memory usage of their systems
may care about providing stricter bounds to these fields.

Note that the Encryption Context field in the header
and the signature length field in the footer are also variable length,
but their size only goes up to 2^16 bytes (64 KiB).
This size is well within the bounds of memory runtime limits for the most languages,
and thus we do not consider the bounds of these fields a concern.

Note that all implementations dynamically allocate resources while processing messages.

### When should users set this value?

Users should set this value if they have a use case where they need to process messages of
unknown size and those messages do not come from a trusted source.

### When should users NOT set this value?

This control should be considered strictly an operational control that can
mitigate highly-bounded resource consumption for certain use cases.

If a user has a security requirement to not decrypt messages with a certain content length
or message header length
(e.g. try to enforce a “sign only” use case by only decrypting zero length messages),
that security requirement should be met by construction through
use of a custom CMM as opposed to using these controls.

### What value should they set it to?

Users should choose reasonable values for their use case and
the messages that they expect to decrypt.
They should expect the memory usage of the ESDK to scale linearly with this control,
and can performance test their application to determine
the ESDKs memory cost in practice for their use case.

### Why not just provide one control that “does the right thing” for most use cases?

The two controls end up mitigating two different sorts of resource consumption concerns.
For `Max Body Size`, this ensures that in the short term memory doesn't spike by a certain factor.
This field can be used to ensure that the decryption of a frame or
an unframed message doesn't immediately exhaust memory linear to a factor of that value.

For `Max Header Size`, this has a fuzzier implication on memory that
will greatly depend on the implementation,
and represents a memory requirement that exists for the duration of the decryption operation.

By separating these controls,
we ensure that the controls are clear and simple,
and can easily be applied to a wide variety of use cases.

### Should there be a lower limit for Max Header Size?

In order to allow the smallest the message header format allows
(no AAD, one EDK but the EDK fields themselves are empty),
any useful `Max Header Size` needs to be at least 40 bytes.
However, future message formats might have different lower limits,
and thus we wouldn't be able to know until we begin processing the message
whether the value set is valid for that message or not.
As such, there is not much value in enforcing a limit on this control.

### Will this value still be valid if/when we update the message format?

This control does not introduce any one-way doors that would limit
how we might update the message format in the future.

Conceptually, this should apply nicely to any new message format.
With a new message format, our concerns about memory limits should be similar.
There is not a way around needing to process a whole frame before releasing any plaintext,
meaning that we will always want some control on the encrypted content size.
The message header will always contain some metadata that the ESDK might need to hold in memory,
meaning that a control on the header size would still be useful.

## Reference-level Explanation

Specify two optional inputs on Decrypt, `Max Header Size` and `Max Body Size`

### Max Body Size

If `max body size` is set on Decrypt, then the operation:

- MUST halt and fail if processing an unframed message with encrypted content field
  of a length greater than (>) Max Body Size, and MUST NOT attempt decryption on such a message.
  - This means that when decrypting an unframed message,
    if Max Body Size is set then the ESDK MUST fail if the encrypted content length field
    in the message body is greater than Max Body Size.
- MUST halt and fail if processing a message frame with an encrypted content field
  of a length greater than (>) Max Body Size, and MUST NOT attempt decryption on any such frame.
  - This means that when decrypting a regular frame in a framed message,
    if Max Body Size is set then the ESDK MUST fail if the frame length
    set in the header is greater than Max Body Size.
  - This means that when decrypting a final frame in a framed message,
    if Max Body Size is set then the ESDK MUST fail if the encrypted content length field
    set in the final frame is greater than Max Body Size.
  - Note that there is an edge case for messages with bodies that only consist of a final frame.
    Specifically, a message are allowed to have a frame size (stated in the header)
    greater than (>) Max Body Size but the message only contains one final frame,
    and that final frame has an encrypted content length less than or equal to (<=) Max Body Size.
    This means that implementations MUST NOT only fail
    based on the frame size in the message header,
    and MUST check the first frame in the message.
    We allow this is because the Frame Size input is idependent of Max Body Size,
    and thus expresses a user intent that should not be conflated with Max Body Size.

### Max Header Size

If `Max Header Size` is set on Decrypt, then the operation:

- MUST halt and fail if processing a message with a message header of a length
  greater than (>) `Max Header Size`,
  and MUST NOT attempt to parse greater than (>) `Max Header Size` bytes of a message header.
  - Note that the message header does not contain a field that describes its total length,
    and thus implementations MUST attempt to process the message header until
    it either succeeds parsing the message header
    or it can determine that the total length of the header exceeds `Max Header Size` and fails.
    For example, if the amount of bytes it would take to process the next field in the header
    would make the total bytes in the header exceed `Max Header Size`,
    then the ESDK MUST immediately fail instead of attempting to process those bytes.
