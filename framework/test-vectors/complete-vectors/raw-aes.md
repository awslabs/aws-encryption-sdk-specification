[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Raw AES Keyring Vectors

## Version

1.0.0

## Summary

This describes the test cases for the [Raw AES Keyring](../../raw-aes-keyring.md)

## Reference-level Explanation

## Definitions
- positive key description: a [key description](../key-description.md) that when parsed and generated can produce
valid encryption and decryption materials.

### Basic tests

A positive key description for each [wrapping algorithm](../../raw-aes-keyring.md#wrapping-algorithm) MUST be generated.
This MUST point to a different key for each wrapping algorithm key length in the keys manifest.
The provider-id for each wrapping algorithm scheme MUST be different.
A test MUST attempt to encrypt and decrypt
with every available [algorithm suite](../../algorithm-suites.md#algorithm-suite-id)
A test MUST attempt every [standard encryption context](./encryption-context.md#standard-encryption-contexts).
