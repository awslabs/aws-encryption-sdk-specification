[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Raw RSA Keyring public/private key validation

## Affected Features

This serves as a reference of all features that this change affects.

| Feature |
| ------- |
| [Raw RSA Keyring](https://github.com/awslabs/aws-encryption-sdk-specification/blob/31b0534c4259aad365f048b73231545583389c67/framework/raw-rsa-keyring.md) |


## Affected Specifications

This serves as a reference of all specification documents that this change affects.

| Specification |
| ------------- |
| [Raw RSA Keyring](https://github.com/awslabs/aws-encryption-sdk-specification/blob/31b0534c4259aad365f048b73231545583389c67/framework/raw-rsa-keyring.md) |


## Affected Implementations

This serves as a reference for all implementations that this change affects.

| Language   | Repository                                                                            |
| ---------- | ------------------------------------------------------------------------------------- |
| C          | [aws-encryption-sdk-c](https://github.com/aws/aws-encryption-sdk-c)                   |
| Javascript | [aws-encryption-sdk-javascript](https://github.com/aws/aws-encryption-sdk-javascript) |

## Definitions

- "match", "matching pair" describe an interoperable RSA public key, and RSA private key
 (i.e. a ciphertext encrypted by the public key can be decrypted by the private key)

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

Add a requirement to the Raw RSA Keyring that if both the public key and the private key are defined,
they MUST form a matching pair.

Clarify language in OnEncrypt and OnDecrypt to require failure, instead of the vague "MUST NOT succeed".

## Out of Scope

- All keyrings aside from the Raw RSA Keyring
- The manner in which the Raw RSA Keyring is build/constructed/instantiated
- How to determine if a pair of keys match

## Motivation

A Raw RSA Keyring with mismatched keys is by construction unable to fulfill its decryption contract.
As such, we should not allow such a keyring to be constructed.

Language clarification around failure is needed,
as previous language "MUST NOT succeed" could imply a non-failure response is valid
(such as returning encryption/decryption materials unmodified).

## Drawbacks

This change will break customers who are using the Raw RSA Keyring with a non-matching keypair.
However, this is not use case we should encourage.

## Security Implications

This change SHOULD NOT have any security implications.

## Operational Implications

This change SHOULD NOT have any operational implications.

## Guide-level Explanation

When you attempt to create a Raw RSA Keyring with both a public and private key,
the ESDK MUST check to ensure the keys match.
If they keys to not match, the creation operation MUST fail.

## Reference-level Explanation

- A check MUST be added in the operation which creates a Raw RSA Keyring
  - The check MUST only be run if both a public key and private key are defined
  - The check MUST determine if the public key and private key form a matching pair
  - If they do not form a matching pair, the operation MUST fail
- OnEncrypt MUST fail immediately if the Raw RSA Keyring's public key is not defined
- OnDecrypt MUST fail immediately if the Raw RSA Keyring's private key is not defined
