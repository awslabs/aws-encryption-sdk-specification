[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Key Description

## Version

1.0.0

## Dependencies

This serves as a reference of all features that this feature depends on.

| Feature                             | Min Version | Max Version |
| ----------------------------------- | ----------- | ----------- |
| [keys-manifest](./keys-manifest.md) | 1           | n/a         |

## Summary

The Key Description structure defines a standard way of describing
keyring configuration as part of a manifest.
The MPL describes a common way
to configure key distribution.
These key descriptions explain how to instantiate the required [keyring](../keyring-interface.md)
or [cmm](../cmm-interface.md).

## Out of Scope

This file does not define any actual manifests,
only a common structure that is used in Crypto Tools libraries manifest definitions
that need to include a description of a key description.

## Motivation

Several manifests have a requirement to define keyrings that need to
be constructed while processing that manifest.
In order to maintain consistency for these definitions across manifest types,
this file defines how keyrings are defined in any
manifest type that needs to describe keyring configuration.

There are also legacy test vectors that exist.
This key description MUST be compatible
with these legacy objects.
These objects were referred to as Master Keys
and Master Key Providers.

## Guide-level Explanation

The master key structure is a JSON structure that identifies necessary characteristics
about an AwsCryptographicMaterialProvidersLibrary keyring.

## Reference-level Explanation

### Contents

A key description structure is defined as a JSON object with the following members:

- `type` : Type of keyring/cmm
  - Allowed Values
    - `static-material-keyring`
    - `aws-kms`
    - `aws-kms-mrk-aware`
    - `aws-kms-mrk-aware-discovery`
    - `raw`
    - `aws-kms-hierarchy`
    - `aws-kms-rsa`
    - `caching-cmm`
    - `required-encryption-context-cmm`
- `key` : Name of key from a `keys` manifest.
  For some types, like discovery or CMMs, a key is not required.
- The key ID should always be `key.key-id`

For the `raw` type the following members exist:

- `provider-id` : Key Provider ID (required for Raw keyrings)
- `encryption-algorithm` : Encryption Algorithm (required for Raw keyrings)
- Allowed Values
- `aes`
- `rsa`

For a `raw` `rsa` the following members exist:

- `padding-algorithm` : Padding Algorithm (required for RSA Raw Master Keys)
- Allowed Values
- `pkcs1`
- `oaep-mgf1`
- `padding-hash` : Hash Algorithm used with Padding Algorithm (required if `padding-algorithm` is `oaep-mgf1`)
- Allowed Values
- `sha1`
- `sha256`
- `sha384`
- `sha512`

For a `aws-kms-mrk-aware-discovery` type the following members exist:

- `key` is not required.
- `default-mrk-region` An AWS region
- `aws-kms-discovery-filter` that has the following:
  - `partition` A partition string
  - `account-ids` An array of AWS account ID string

For a CMM types like `caching-cmm` or `required-encryption-context-cmm` type
an `underlying` member exists that is the keyring or cmm that this element would wrap.

### Examples

```json
{
  "type": "aws-kms",
  "key": "us-west-2-decryptable"
}
```

```json
{
  "type": "raw",
  "provider-id": "aws-raw-vectors-persistent",
  "key": "rsa-4096-private",
  "encryption-algorithm": "rsa",
  "padding-algorithm": "oaep-mgf1",
  "padding-hash": "sha256"
}
```

```json
{
  "type": "aws-kms-mrk-aware-discovery",
  "default-mrk-region": "us-west-2",
  "aws-kms-discovery-filter": {
    "partition": "aws",
    "account-ids": ["658956600833"]
  }
}
```

```json
{
  "type": "caching-cmm",
  "underlying": {
    "type": "static-material-keyring",
    "key": "static-cashable-plaintext-data-key"
  },
  "cacheLimitTtlSeconds": 5,
  "getEntryIdentifier": "+m9XmK8rzu0FLMlFmaElNNLcW7Cpp452Tcb/HepBGBbMR2DEfQBRroQbS6jq1acjpjx5hQ9GRKphCCy/ltmHFw==",
  "putEntryIdentifier": ""
}
```
