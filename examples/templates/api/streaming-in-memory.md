[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Basic use of stream APIs example using an in-memory stream

Implementations of this example MUST follow the rules defined in
[Example Templates](../../../examples.md#example-templates).

## Implementations

- [Python (DEV)](https://github.com/aws/aws-encryption-sdk-python/blob/keyring/examples/src/in_memory_streaming_defaults.py)
- [Java (DEV)](https://github.com/aws/aws-encryption-sdk-java/blob/keyring/src/examples/java/com/amazonaws/crypto/examples/InMemoryStreamingDefaults.java)

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Header

```
# This example shows how to use the streaming encrypt and decrypt APIs on data in memory.
#
# One benefit of using the streaming API is that
# we can check the encryption context in the header before we start decrypting.
#
# In this example, we use an AWS KMS customer master key (CMK),
# but you can use other key management options with the AWS Encryption SDK.
# For examples that demonstrate how to use other key management configurations,
# see the ``keyring`` and ``master_key_provider`` directories.
```

## Summary

```
# Demonstrate an encrypt/decrypt cycle using the streaming encrypt/decrypt APIs in-memory.
```

## Inputs

- **source plaintext** :
  Plaintext to encrypt
- **AWS KMS CMK** :
  The ARN of an AWS KMS CMK that protects data keys

## Steps

1. Define encryption context.

   ```
   # Prepare your encryption context.
   # Remember that your encryption context is NOT SECRET.
   # https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/concepts.html#encryption-context
   encryption_context = {
       "encryption": "context",
       "is not": "secret",
       "but adds": "useful metadata",
       "that can help you": "be confident that",
       "the data you are handling": "is what you think it is",
   }
   ```

1. Create keyring.

   ```
   # Create the keyring that determines how your data keys are protected.
   ```

1. Encrypt plaintext data.

   ```
   # Create a plaintext stream from the source plaintext.
   ```

   ```
   # Use the streaming encryption API to encrypt the plaintext.
   ```

1. Compare ciphertext to plaintext.

   ```
   # Demonstrate that the ciphertext and plaintext are different.
   ```

1. Decrypt encrypted data,
   verifying the encryption context before decrypting body.

   ```
   # Open a decryption stream to decrypt the encrypted message.
   #
   # Before decrypting the plaintext,
   # check the encryption context in the header.
   #
   # Verify that the encryption context used in the decrypt operation includes
   # the encryption context that you specified when encrypting.
   # The AWS Encryption SDK can add pairs, so don't require an exact match.
   #
   # In production, always use a meaningful encryption context.
   #
   # Now that we are more confident that we will decrypt the right message,
   # we can start decrypting.
   ```

1. Compare the decrypted plaintext and original plaintext.

   ```
   # Demonstrate that the decrypted plaintext is identical to the original plaintext.
   ```
