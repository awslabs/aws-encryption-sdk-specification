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

The [Decrypt](../../client-apis/decrypt.md) only requires
that the [encryption context](../../framework/structures.md#encryption-context) that is used as
additional authenticated data during the decryption of the input [encrypted message](#encrypted-message)
is returned.

Additionally it should also return the
[encryption context used for authentication only](../../client-apis/decrypt.md#encryption-context-to-only-authenticate)
if it used any during the operation.

### `decrypt` API returns encryption context used as AAD and encryption context used for authentication only

On encrypt the [required encryption context cmm](../../framework/required-encryption-context-cmm.md),
is able to filter out encryption context key-value pairs that are not stored on the message.

If the required encryption context CMM filters out encryption context keys from the Additional Authenticated
Data stored on the header, Decrypt MUST use the
[encryption context to only authenticate](../../client-apis/decrypt.md#encryption-context-to-only-authenticate)
to verify the header auth tag.

The encryption context to only authenticate MUST be the [encryption context](../framework/structures.md#encryption-context)
in the [decryption materials](../framework/structures.md#decryption-materials)
filtered to only contain key value pairs listed in
the [decryption material's](../framework/structures.md#decryption-materials)
[required encryption context keys](../framework/structures.md#required-encryption-context-keys-1)
serialized according to the [encryption context serialization specification](../framework/structures.md#serialization).

`decrypt` MUST return the union of the encryption context serialized into the message header and
the [encryption context for authentication only](#encryption-context-to-only-authenticate), if available.
