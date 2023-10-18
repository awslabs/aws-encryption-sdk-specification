[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Aws Kms Keyring Vectors

## Version

1.0.0

## Summary

This describes the test cases for the [Aws Kms Keyring](../../aws-kms/aws-kms-keyring.md)

## Reference-level Explanation

### Basic tests

A test MUST attempt both a single region key
and a multi region key.
A test MUST attempt to encrypt and decrypt
with every available [algorithm suite](../../algorithm-suites.md#algorithm-suite-id)
A test MUST attempt every [standard encryption context](./encryption-context.md#standard-encryption-contexts).
