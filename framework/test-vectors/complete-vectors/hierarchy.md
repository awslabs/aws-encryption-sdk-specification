[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Aws Kms Hierarchical Keyring Vectors

## Version

1.0.0

## Summary

This describes the test cases for the [Aws Kms Hierarchical Keyring](../../aws-kms/aws-kms-hierarchical-keyring.md)

## Reference-level Explanation

### Basic tests

For a given static branch key,
a test MUST attempt to encrypt and decrypt
with every available [algorithm suite](../../algorithm-suites.md#algorithm-suite-id)

For every available algorithm suite and static branch key,
a test MUST attempt to encrypt and decrypt with every [standard encryption context](./encryption-context.md#standard-encryption-contexts).

### Input dimensions

- encrypting key type: "aws-kms-hierarchy"
- decrypting key type: "aws-kms-hierarchy"
- key: [
    "static-branch-key-1",
    "static-branch-key-2"
]

### Evaluation rules

- If encrypting key type is anything other than `"aws-kms-hierarchy"`
and decrypting key type is `"aws-kms-hierarchy"`,
the result should be `"negative-decrypt"`.
- If encrypting key type is `"aws-kms-hierarchy"`
and decrypting key type is anything other than `"aws-kms-hierarchy"`,
the result should be `"negative-decrypt"`.
- If encrypting and decrypting key type are both `"aws-kms-hierarchy"`
and the `"key"` is different on encrypt and decrypt,
the result should be `"negative-decrypt"`.
- In all other cases, the result should be `"positive"`.