[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Check Required Encryption Context Keys exist in Encryption Context in Decrypt and the values match in the stored Encryption Context in the message header

## Affected Implementations

This serves as a reference for all implementations that this change affects.

| Language   | Repository                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| Java       | [aws-encryption-sdk-java](https://github.com/aws/aws-encryption-sdk-java)                                      |
| .NET       | [aws-encryption-sdk-net](https://github.com/aws/aws-encryption-sdk-dafny/tree/mainline/aws-encryption-sdk-net) |
| Python     | [aws-encryption-sdk-python](https://github.com/aws/aws-encryption-sdk-python)                                  |
| CLI        | [aws-encryption-sdk-cli](https://github.com/aws/aws-encryption-sdk-cli)                                        |
| C          | [aws-encryption-sdk-c](https://github.com/aws/aws-encryption-sdk-c)                                            |
| Javascript | [aws-encryption-sdk-javascript](https://github.com/aws/aws-encryption-sdk-javascript)                          |

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

The [Decrypt](../../client-apis/decrypt.md) API does not specify
how it should deal with required encryption context keys it receives from the call to the
Cryptographic Materials Manager, the encryption context it optionally takes in, and the stored
encryption context on the message header.

For required encryption context keys the value in stored in the message header
MUST equal the value in decryption materials encryption context.

### `decrypt` API required encryption context keys and stored encryption context verification

Before verifying the message header, Decrypt MUST verify
that if a [required encryption context key](../../framework/structures.md#required-encryption-context-keys)
exists in the message [header's AAD](../../data-format/message-header.md#aad)
the value in the [decryption materials' encryption context](../../framework/structures.md#decryption-materials)
MUST match what is store in the message header.

This verifies that the reproduced encryption context is used to decrypt the message and
NOT some key-value pair that the underlying CMM MAY have modified.

If required keys exist, match stored encryption context, AND decryption succeeds
Decrypt MUST return the Encryption Context stored in the header AND the
encryption context to only authenticate.
The encryption context to only authenticate MUST be the [encryption context](../framework/structures.md#encryption-context)
in the [decryption materials](../framework/structures.md#decryption-materials)
filtered to only contain key value pairs listed in
the [decryption material's](../framework/structures.md#decryption-materials)
[required encryption context keys](../framework/structures.md#required-encryption-context-keys-1).
