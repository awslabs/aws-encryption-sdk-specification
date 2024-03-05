[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Aws Kms Mrk Discovery Keyring Vectors

## Version

1.0.0

## Summary

This describes the test cases for the [Aws Kms Mrk Discovery Keyring](../../aws-kms/aws-kms-mrk-discovery-keyring.md)

## Reference-level Explanation

### Basic tests

A test MUST attempt to encrypt with a single region key.
A test MUST attempt to encrypt with a multi region key.
A test MUST attempt to decrypt with a discovery filter and without a filter.
A test MUST attempt to encrypt and decrypt
with every available [algorithm suite](../../algorithm-suites.md#algorithm-suite-id)
A test MUST attempt every [standard encryption context](./encryption-context.md#standard-encryption-contexts).
