[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Raw RSA Keyring Vectors

## Version

1.0.0

## Summary

This describes the test cases for the [Raw RSA Keyring](../../raw-rsa-keyring.md)

## Reference-level Explanation

### Basic tests

A positive key descriptions every [supported padding scheme](../../raw-rsa-keyring.md#supported-padding-schemes) MUST be generated.
The provider-id for each padding scheme MUST be different.
A test MUST attempt to encrypt and decrypt
with every available [algorithm suite](../../algorithm-suites.md#algorithm-suite-id)
A test MUST attempt every [standard encryption context](./encryption-context.md#standard-encryption-contexts).
