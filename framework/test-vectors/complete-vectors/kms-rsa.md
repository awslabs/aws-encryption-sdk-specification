[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

## Summary

This describes the test cases for the [Aws Kms Rsa Keyring](../../aws-kms/aws-kms-rsa-keyring.md)

## Reference-level Explanation

### Basic tests

A test MUST attempt with every RSA EncryptionAlgorithmSpec.

A test MUST attempt to encrypt and decrypt
with every non-signing [algorithm suite](../../algorithm-suites.md#algorithm-suite-id).
The Aws Kms Rsa Keyring does not support asymmetric signing
because the encryption context can be changed.
Because the public half of the RSA key is public.

A test MUST attempt every [standard encryption context](./encryption-context.md#standard-encryption-contexts).
