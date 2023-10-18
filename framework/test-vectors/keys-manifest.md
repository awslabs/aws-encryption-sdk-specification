[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Keys Manifest

## Version

1.0.0

## Summary

A keys manifest defines raw key materials for use in tests defined in other manifests.

## Out of Scope

This file is not a definition of how these keys should be used by any given tests.

## Motivation

Defining keys separately from individual test vectors enables us to reuse test key materials
across many test manifests. This is useful when defining many tests to avoid duplicating
effort generating and space saving keys for each test. It also allows for single-source definition
of specific keys that might have specific behaviors. This could include special key materials
such as null keys or special key references such as identifying a specific AWS KMS keys.

## Security Implications

All keys defined in this manifest type are by definition public knowledge.
They must be treated as such.

## Guide-level Explanation

Keys are defined in a JSON manifest file. Each key entry defines a key material, an encoding,
and an optional line separator. These are used to load each key from the manifest for use in
generating or processing additional manifests.

## Reference-level Explanation

### Contents

#### manifest

Map identifying the manifest.

- `type` : Identifies the manifest as a keys manifest.
  - Must be `keys`
- `version` : Identifies the version of this feature document that describes the manifest.

### keys

Map structure mapping key names to key descriptions.

#### Raw Wrapping Keys

Raw Wrapping Keys are stored as JSON objects with the following attributes:

- `key-id` : The key ID that should be used to identify this key material
- `encrypt` : Boolean that defines whether or not this key should be used to encrypt
- `decrypt` : Boolean that defines whether or not this key should be used to decrypt
- `algorithm` : Defines the algorithm type
  - Allowed Values
    - `aes`
    - `rsa`
- `type` : Defines the key type
  - Allowed Values
    - `aws-kms`
    - `symmetric`
    - `private`
    - `public`
- `bits` : Defines the key length in bits
- `encoding` : Encoding used to store key
  - Allowed Values
    - `base64` : Key material bytes are encoded using base64.
    - `pem` : Key material bytes are encoded using PEM format.
- `material` : String containing the encoded key material.

#### KMS

Keys can also reference an AWS KMS CMK. They should contain the following attributes.

- `type`: Identifies the key type
  - Must be `aws-kms`
- `key-id`: KMS CMK ID

#### Static Material

A key that defines the encryption materials or decryption materials to return.
These materials MUST be static and the same materials will be returned
for any keyring operation.

- `type`: Identifies the key type
  - Must be `static-material`
- `algorithmSuiteId`: The hex string for the [algorithmSuiteId](../algorithm-suites.md#supported-algorithm-suites)
- `encryptionContext`: A JSON object of string: string values for the [encryption context](../structures.md#encryption-context)
- `encryptedDataKeys`: An array of JSON objects describing the [encrypted data keys](../structures.md#encrypted-data-keys)
  - `keyProviderId`
  - `keyProviderInfo`
  - `ciphertext`
- `requiredEncryptionContextKeys`: A list of [required encryption context keys](../structures.md#required-encryption-context-keys)

### Example

```json
{
  "manifest": {
    "type": "keys",
    "version": 2
  },
  "keys": {
    "aes-256": {
      "key-id": "aes-256-raw",
      "encrypt": true,
      "decrypt": true,
      "algorithm": "aes",
      "type": "symmetric",
      "bits": 256,
      "encoding": "base64",
      "material": "yar+8MbgZemJ9j41RjNpiYVCblujSNkYTIeKC/EEADc="
    },
    "rsa-2048-private": {
      "key-id": "rsa-2048-raw",
      "encrypt": true,
      "decrypt": true,
      "algorithm": "rsa",
      "type": "private",
      "bits": 2048,
      "encoding": "pem",
      "material": "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAo8uCyhiO4JUGZV+rtNq5DBA9Lm4xkw5kTA3v6EPybs8bVXL2\nZE6jkbo+xT4Jg/bKzUpnp1fE+T1ruGPtsPdoEmhY/P64LDNIs3sRq5U4QV9IETU1\nvIcbNNkgGhRjV8J87YNY0tV0H7tuWuZRpqnS+gjV6V9lUMkbvjMCc5IBqQc3heut\n/+fH4JwpGlGxOVXI8QAapnSy1XpCr3+PT29kydVJnIMuAoFrurojRpOQbOuVvhtA\ngARhst1Ji4nfROGYkj6eZhvkz2Bkud4/+3lGvVU5LO1vD8oY7WoGtpin3h50VcWe\naBT4kejx4s9/G9C4R24lTH09J9HO2UUsuCqZYQIDAQABAoIBAQCfC90bCk+qaWqF\ngymC+qOWwCn4bM28gswHQb1D5r6AtKBRD8mKywVvWs7azguFVV3Fi8sspkBA2FBC\nAt5p6ULoJOTL/TauzLl6djVJTCMM701WUDm2r+ZOIctXJ5bzP4n5Q4I7b0NMEL7u\nixib4elYGr5D1vrVQAKtZHCr8gmkqyx8Mz7wkJepzBP9EeVzETCHsmiQDd5WYlO1\nC2IQYgw6MJzgM4entJ0V/GPytkodblGY95ORVK7ZhyNtda+r5BZ6/jeMW+hA3VoK\ntHSWjHt06ueVCCieZIATmYzBNt+zEz5UA2l7ksg3eWfVORJQS7a6Ef4VvbJLM9Ca\nm1kdsjelAoGBANKgvRf39i3bSuvm5VoyJuqinSb/23IH3Zo7XOZ5G164vh49E9Cq\ndOXXVxox74ppj/kbGUoOk+AvaB48zzfzNvac0a7lRHExykPH2kVrI/NwH/1OcT/x\n2e2DnFYocXcb4gbdZQ+m6X3zkxOYcONRzPVW1uMrFTWHcJveMUm4PGx7AoGBAMcU\nIRvrT6ye5se0s27gHnPweV+3xjsNtXZcK82N7duXyHmNjxrwOAv0SOhUmTkRXArM\n6aN5D8vyZBSWma2TgUKwpQYFTI+4Sp7sdkkyojGAEixJ+c5TZJNxZFrUe0FwAoic\nc2kb7ntaiEj5G+qHvykJJro5hy6uLnjiMVbAiJDTAoGAKb67241EmHAXGEwp9sdr\n2SMjnIAnQSF39UKAthkYqJxa6elXDQtLoeYdGE7/V+J2K3wIdhoPiuY6b4vD0iX9\nJcGM+WntN7YTjX2FsC588JmvbWfnoDHR7HYiPR1E58N597xXdFOzgUgORVr4PMWQ\npqtwaZO3X2WZlvrhr+e46hMCgYBfdIdrm6jYXFjL6RkgUNZJQUTxYGzsY+ZemlNm\nfGdQo7a8kePMRuKY2MkcnXPaqTg49YgRmjq4z8CtHokRcWjJUWnPOTs8rmEZUshk\n0KJ0mbQdCFt/Uv0mtXgpFTkEZ3DPkDTGcV4oR4CRfOCl0/EU/A5VvL/U4i/mRo7h\nye+xgQKBgD58b+9z+PR5LAJm1tZHIwb4tnyczP28PzwknxFd2qylR4ZNgvAUqGtU\nxvpUDpzMioz6zUH9YV43YNtt+5Xnzkqj+u9Mr27/H2v9XPwORGfwQ5XPwRJz/2oC\nEnPmP1SZoY9lXKUpQXHXSpDZ2rE2Klt3RHMUMHt8Zpy36E8Vwx8o\n-----END RSA PRIVATE KEY-----"
    },
    "us-west-2-decryptable": {
      "encrypt": true,
      "decrypt": true,
      "type": "aws-kms",
      "key-id": "arn:aws:kms:us-west-2:658956600833:alias/EncryptDecrypt"
    },
    "us-west-2-encrypt-only": {
      "encrypt": true,
      "decrypt": false,
      "type": "aws-kms",
      "key-id": "arn:aws:kms:us-west-2:658956600833:alias/EncryptOnly"
    },
    "no-plaintext-data-key": {
      "type": "static-material",
      "algorithmSuiteId": "0014",
      "encryptionContext": {},
      "encryptedDataKeys": [
        {
          "keyProviderId": "invalid-keyring",
          "keyProviderInfo": "c3RhdGljLXBsYWludGV4dA==",
          "ciphertext": "AQEBAQEBAQEBAQEBAQEBAQ=="
        }
      ],
      "requiredEncryptionContextKeys": []
    }
  }
}
```
