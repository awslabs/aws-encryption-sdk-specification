[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Basic use of stream APIs example using files

Implementations of this example MUST follow the rules defined in
[Example Templates](../../../examples.md#example-templates).

## Implementations

- [Python (DEV)](https://github.com/aws/aws-encryption-sdk-python/blob/keyring/examples/src/file_streaming_defaults.py)
- [Java (DEV)](https://github.com/aws/aws-encryption-sdk-java/blob/keyring/src/examples/java/com/amazonaws/crypto/examples/FileStreamingDefaults.java)

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Header

```python
# This example shows how to use the streaming encrypt and decrypt APIs when working with files.
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

```python
# Demonstrate an encrypt/decrypt cycle using the streaming encrypt/decrypt APIs with files.
```

## Inputs

- **source plaintext filename** :
  Path to plaintext file to encrypt
- **AWS KMS CMK** :
  The ARN of an AWS KMS CMK that protects data keys

## Steps

1. Define file targets.

   ```python
   # We assume that you can also write to the directory containing the plaintext file,
   # so that is where we will put all of the results.
   ciphertext_filename = source_plaintext_filename + ".encrypted"
   decrypted_filename = ciphertext_filename + ".decrypted"
   ```

1. Define encryption context.

   ```python
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

   ```python
   # Create the keyring that determines how your data keys are protected.
   keyring = AwsKmsKeyring(generator_key_id=aws_kms_cmk)
   ```

1. Encrypt plaintext data.

   ```python
   # Open the files you want to work with.
   with open(source_plaintext_filename, "rb") as plaintext, open(ciphertext_filename, "wb") as ciphertext:
       # The streaming API provides a context manager.
       # You can read from it just as you read from a file.
       with aws_encryption_sdk.stream(
           mode="encrypt", source=plaintext, encryption_context=encryption_context, keyring=keyring
       ) as encryptor:
           # Iterate through the segments in the context manager
           # and write the results to the ciphertext.
           for segment in encryptor:
               ciphertext.write(segment)
   ```

1. Compare ciphertext to plaintext.

   ```python
   # Demonstrate that the ciphertext and plaintext are different.
   assert not filecmp.cmp(source_plaintext_filename, ciphertext_filename)
   ```

1. Decrypt encrypted data,
   verifying the encryption context before decrypting body.

   ```python
   # Open the files you want to work with.
   with open(ciphertext_filename, "rb") as ciphertext, open(decrypted_filename, "wb") as decrypted:
       # Decrypt your encrypted data using the same keyring you used on encrypt.
       #
       # You do not need to specify the encryption context on decrypt
       # because the header of the encrypted message includes the encryption context.
       with aws_encryption_sdk.stream(mode="decrypt", source=ciphertext, keyring=keyring) as decryptor:
           # Check the encryption context in the header before we start decrypting.
           #
           # Verify that the encryption context used in the decrypt operation includes
           # the encryption context that you specified when encrypting.
           # The AWS Encryption SDK can add pairs, so don't require an exact match.
           #
           # In production, always use a meaningful encryption context.
           assert set(encryption_context.items()) <= set(decryptor.header.encryption_context.items())

           # Now that we are more confident that we will decrypt the right message,
           # we can start decrypting.
           for segment in decryptor:
               decrypted.write(segment)
   ```

1. Compare the decrypted plaintext and original plaintext.

   ```python
   # Demonstrate that the decrypted plaintext is identical to the original plaintext.
   assert filecmp.cmp(source_plaintext_filename, decrypted_filename)
   ```