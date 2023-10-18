[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

## Summary

This describes how to construct a complete set of positive encryption test vectors.

### Positive Key Descriptions

Each key description type MUST be generated:

- `aws-kms`
- `raw`
- `aws-kms-mrk-aware-discovery`
- `aws-kms-mrk-aware`
- `static-material`

For `aws-kms` a positive key description for single region key
and a multi region key MUST be generated.
The encrypt and decrypt descriptions MUST be for the same KMS key id.

For `raw` `rsa` a positive key descriptions every [supported padding scheme](../raw-rsa-keyring.md#supported-padding-schemes) MUST be generated.
The provider-id for each padding scheme MUST be different.
The encrypt and decrypt descriptions MUST be for the public and private keys respectively.

For `raw` `aes` a positive key description for each [wrapping algorithm](../raw-aes-keyring.md#wrapping-algorithm) MUST be generated.
This MUST point to a different key for each wrapping algorithm key length in the keys manifest.
The encrypt and decrypt descriptions MUST be for the same aes key id.

For `aws-kms-mrk-aware` a positive key description for a Multi Region Key
in at least 2 regions MUST be generated.
The encrypt and decrypt descriptions MUST permute the regional combinations.
e.g. all

- encrypt: us-east-1, decrypt: us-east-1
- encrypt: us-east-1, decrypt: us-west-2
- encrypt: us-west-2, decrypt: us-east-1
- encrypt: us-west-2, decrypt: us-west-2

For `aws-kms-mrk-aware-discovery` a positive key description encrypting with a Multi Region Key
in at least 2 regions and decrypting with discovery MUST be generated.
The encrypt description MUST be both in the same region and in a different region than the discovery decrypt description.

### AlgorithmSuites

MUST include all [supported algorithm sets](../algorithm-suites.md#supported-algorithm-suites)

### Encryption Context

MUST have an empty map.
MUST have a small map.
MUST have a large map.
MUST have multibyte UTF8 characters in both the key and value.

### requiredEncryptionContextKeys

MUST have an empty list
MUST have a list that is a sub set of the encryption context
MUST have a list that is all keys in the encryption context
