[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Required Encryption Context CMM Vectors

## Version

1.0.0

## Summary

This describes the test cases for the [Required Encryption Context CMM](../../required-encryption-context-cmm.md)

## Reference-level Explanation

### Basic tests

A test MUST verify that on both encrypt and decrypt the correct 
plaintext data key is produced.

A test MUST verify that an encrypt keyring that returns
an incorrect plaintext data key will fail.

A test MUST verify that a decrypt keyring that returns
an incorrect plaintext data key will fail.

With the above tests we infer
that all other keyring tests that are wrapped by the DefaultCMM
will fail successfully if the materials returned are not valid.

For every non signing algorithm suite, a test MUST verify that
no verification key is appended to the encryption context.

For every signing algorithm suite, a test MUST verify that
a verification key is appended to the encryption context.
