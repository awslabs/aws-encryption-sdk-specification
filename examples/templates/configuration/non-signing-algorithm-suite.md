[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# NonSigning Algorithm Suite example

Implementations of this example MUST follow the rules defined in
[Example Templates](../../../examples.md#example-templates).

## Implementations

- [NET](https://github.com/aws/aws-encryption-sdk-dafny/blob/mainline/aws-encryption-sdk-net/Examples/NonSigningAlgorithmSuiteExample.cs)

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Header

```
Demonstrate an encrypt/decrypt cycle using a raw AES keyring and a non-signing Algorithm Suite.
This also demonstrates how to customize the Algorithm Suite used to encrypt the plaintext.
For a full list of the Algorithm Suites the Encryption SDK supports,
see https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/algorithms-reference.html
```

## Summary

```
Demonstrate an encrypt/decrypt cycle using a non-signing Algorithm Suite.
```

## Inputs

- **plaintext** :
  Plaintext to encrypt

## Steps

1. Instantiate the EncryptionSDK and a Keyring

2. Encrypt the plaintext with a non-signing algorithm.

```
Here, we customize the Algorithm Suite that is used to Encrypt the plaintext.
In particular, we use an Algorithm Suite without Signing.
Signature verification adds a significant performance cost on decryption.
If the users encrypting data and the users decrypting data are equally trusted,
consider using an algorithm suite that does not include signing.
See more about Digital Signatures:
https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/concepts.html#digital-sigs
```

3. Demonstrate that the ciphertext and plaintext are different.

4. Decrypt the ciphertext

5. Demonstrate that the decrypted plaintext and the plaintext are the same.
