[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Which Encryption Context should be used in Decrypt Operations

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Issues and Alternatives

### What kind of Encryption Context should Decrypt return?

Decrypt returns Encryption Context.
This requirement may be satisfied by returning the parsed header that contains this value.

With the addition of the [required encryption context cmm](../../framework/required-encryption-context-cmm.md),
the encrypt API is able to filter out encryption context key-value pairs that
are not stored but instead authenticated.

Currently, on decrypt takes in optional encryption context.
This optional encryption context is used as encryption context for authentication only.

The Required Encryption Context CMM can modify the encryption context on decrypt.
This results in values that are not authenticated against the message or the plaintext data key.

It MUST be required that the decryption materials obtained from the underlying CMM's MUST
contain all configured encryption context keys in its encryption context and the values MUST remain
unchanged.

The Decrypt API MUST return the encryption context stored in the header and the encryption
context used for authentication only.

### What changes to the existing Required Encryption Context CMM are required?

None

### API changes

If required encryption context keys match any keys stored in the message header,
their values MUST match. Otherwise old messages are not compatible with the required encryption context CMM.

```
forall k <- decryptionMaterials.requiredEncryptionContextKeys
   | k in headerEncryptionContext
   :: decryptionMaterials[k] == headerEncryptionContext[k]
```

## Testing

In order to test that decrypt behaves as expected according to the specification, testing should include the following
scenarios to accurately reason about the behavior of using the Required Encryption Context CMM.

### Test Decrypt with Identical Encryption Context

Without using a Required Encryption Context CMM, Decrypt MUST succeed if provided with the identical encryption context
that was used on Encrypt.

```
// The string "asdf" as bytes
var asdf := [ 97, 115, 100, 102 ];
var aesKeyring := GetAesKeyring();

// Test supply same encryption context on encrypt and decrypt NO filtering
var encryptionContext := map[ keyA := valA, keyB := valB ];

var encryptOutput := esdk.Encrypt(Types.EncryptInput(
   plaintext := asdf,
   encryptionContext := Some(encryptionContext),
   materialsManager := None,
   keyring := Some(aesKeyring),
   algorithmSuiteId := None,
   frameLength := None
));

expect encryptOutput.Success?;
var esdkCiphertext := encryptOutput.value.ciphertext;

var decryptOutput := esdk.Decrypt(Types.DecryptInput(
   ciphertext := esdkCiphertext,
   materialsManager := None,
   keyring := Some(aesKeyring),
   encryptionContext := Some(encryptionContext)
));

expect decryptOutput.Success?;
var cycledPlaintext := decryptOutput.value.plaintext;
expect cycledPlaintext == asdf;
```

### Test Filter out Encryption Context on Encrypt AND supply on Decrypt

On Encrypt will not write one key-value pair to the message header and instead will include it in the header signature.
On Decrypt will supply the Encryption Context pair that was not written but will
NOT use the Required Encryption Context CMM. This operation MUST succeed.

```
// The string "asdf" as bytes
var asdf := [ 97, 115, 100, 102 ];
var aesKeyring := GetAesKeyring();

// Test supply same encryption context on encrypt and decrypt NO filtering
var encryptionContext := map[ keyA := valA, keyB := valB ];
var reproducedEncryptionContext := map[keyA := valA];
var requiredEncryptionContextKeys := [keyA];

var defaultCMM :- expect mpl.CreateDefaultCryptographicMaterialsManager(
   mplTypes.CreateDefaultCryptographicMaterialsManagerInput(
         keyring := aesKeyring
   )
);

// Create Required EC CMM with the required EC Keys we want
var reqCMM :- expect mpl.CreateRequiredEncryptionContextCMM(
   mplTypes.CreateRequiredEncryptionContextCMMInput(
         underlyingCMM := Some(defaultCMM),
         keyring := None,
         requiredEncryptionContextKeys := requiredEncryptionContextKeys
   )
);

var encryptOutput := esdk.Encrypt(Types.EncryptInput(
   plaintext := asdf,
   encryptionContext := Some(encryptionContext),
   materialsManager := Some(reqCMM),
   keyring := None,
   algorithmSuiteId := None,
   frameLength := None
));

expect encryptOutput.Success?;
var esdkCiphertext := encryptOutput.value.ciphertext;

var decryptOutput := esdk.Decrypt(Types.DecryptInput(
   ciphertext := esdkCiphertext,
   materialsManager := None,
   keyring := Some(rawAesKeyring),
   encryptionContext := Some(reproducedEncryptionContext)
));

expect decryptOutput.Success?;
var cycledPlaintext := decryptOutput.value.plaintext;
expect cycledPlaintext == asdf;
```

### Test Filter out on Encrypt and Supply on Decrypt with Required Encryption Context CMM

On Encrypt will not write one key-value pair to the message header and instead will include it in the header signature.
On Decrypt will supply the Encryption Context pair that was not written but will
use the Required Encryption Context CMM requiring that the filtered out key on Encrypt is supplied.
This operation MUST succeed.

```
// The string "asdf" as bytes
var asdf := [ 97, 115, 100, 102 ];
var aesKeyring := GetAesKeyring();

// Test supply same encryption context on encrypt and decrypt NO filtering
var encryptionContext := map[ keyA := valA, keyB := valB ];
var reproducedEncryptionContext := map[keyA := valA];
var requiredEncryptionContextKeys := [keyA];

var defaultCMM :- expect mpl.CreateDefaultCryptographicMaterialsManager(
   mplTypes.CreateDefaultCryptographicMaterialsManagerInput(
         keyring := aesKeyring
   )
);

// Create Required EC CMM with the required EC Keys we want
var reqCMM :- expect mpl.CreateRequiredEncryptionContextCMM(
   mplTypes.CreateRequiredEncryptionContextCMMInput(
         underlyingCMM := Some(defaultCMM),
         keyring := None,
         requiredEncryptionContextKeys := requiredEncryptionContextKeys
   )
);

var encryptOutput := esdk.Encrypt(Types.EncryptInput(
   plaintext := asdf,
   encryptionContext := Some(encryptionContext),
   materialsManager := Some(reqCMM),
   keyring := None,
   algorithmSuiteId := None,
   frameLength := None
));

expect encryptOutput.Success?;
var esdkCiphertext := encryptOutput.value.ciphertext;

defaultCMM :- expect mpl.CreateDefaultCryptographicMaterialsManager(
   mplTypes.CreateDefaultCryptographicMaterialsManagerInput(
         keyring := aesKeyring
   )
);

// Create Required EC CMM with the required EC Keys we want
reqCMM :- expect mpl.CreateRequiredEncryptionContextCMM(
   mplTypes.CreateRequiredEncryptionContextCMMInput(
         underlyingCMM := Some(defaultCMM),
         keyring := None,
         requiredEncryptionContextKeys := requiredEncryptionContextKeys
   )
);

var decryptOutput := esdk.Decrypt(Types.DecryptInput(
   ciphertext := esdkCiphertext,
   materialsManager := Some(reqCMM),
   keyring := None,
   encryptionContext := Some(reproducedEncryptionContext)
));

expect decryptOutput.Success?;
var cycledPlaintext := decryptOutput.value.plaintext;
expect cycledPlaintext == asdf;
```

### Test Removing Encryption Context on Encrypt is Backwards Compatible

On Encrypt will write all encryption context supplied to the message.
On Decrypt will have a Required Encryption Context CMM that requires all encryption context
on Decrypt.

```
// The string "asdf" as bytes
var asdf := [ 97, 115, 100, 102 ];
var aesKeyring := GetAesKeyring();

// Test supply same encryption context on encrypt and decrypt NO filtering
var encryptionContext := map[ keyA := valA, keyB := valB ];
var requiredEncryptionContextKeys := [keyA, keyB];
var reproducedEncryptionContext := map[ keyA := valA, keyB := valB];

var defaultCMM :- expect mpl.CreateDefaultCryptographicMaterialsManager(
   mplTypes.CreateDefaultCryptographicMaterialsManagerInput(
         keyring := aesKeyring
   )
);

var encryptOutput := esdk.Encrypt(Types.EncryptInput(
   plaintext := asdf,
   encryptionContext := Some(encryptionContext),
   materialsManager := Some(defaultCMM),
   keyring := None,
   algorithmSuiteId := None,
   frameLength := None
));

expect encryptOutput.Success?;
var esdkCiphertext := encryptOutput.value.ciphertext;

// Create Required EC CMM with the required EC Keys we want
var reqCMM :- expect mpl.CreateRequiredEncryptionContextCMM(
   mplTypes.CreateRequiredEncryptionContextCMMInput(
         underlyingCMM := Some(defaultCMM),
         keyring := None,
         requiredEncryptionContextKeys := requiredEncryptionContextKeys
   )
);

var decryptOutput := esdk.Decrypt(Types.DecryptInput(
   ciphertext := esdkCiphertext,
   materialsManager := Some(reqCMM),
   keyring := None,
   encryptionContext := Some(reproducedEncryptionContext)
));

expect decryptOutput.Success?;
var cycledPlaintext := decryptOutput.value.plaintext;
expect cycledPlaintext == asdf;
```

### Test Different Encryption Context on Decrypt Failure

Encrypt with and store all encryption context in the message header.
On Decrypt will supply additional encryption context not stored in the header.
This operation MUST fail.

```
// The string "asdf" as bytes
var asdf := [ 97, 115, 100, 102 ];
var aesKeyring := GetAesKeyring();

// Test supply same encryption context on encrypt and decrypt NO filtering
var encryptionContext := map[ keyA := valA, keyB := valB ];
var reproducedAdditionalEncryptionContext := map[ keyC := valC ];
var requiredEncryptionContextKeys := [keyA, keyB];

var defaultCMM :- expect mpl.CreateDefaultCryptographicMaterialsManager(
   mplTypes.CreateDefaultCryptographicMaterialsManagerInput(
         keyring := aesKeyring
   )
);

var encryptOutput := esdk.Encrypt(Types.EncryptInput(
   plaintext := asdf,
   encryptionContext := Some(encryptionContext),
   materialsManager := Some(defaultCMM),
   keyring := None,
   algorithmSuiteId := None,
   frameLength := None
));

expect encryptOutput.Success?;
var esdkCiphertext := encryptOutput.value.ciphertext;

// Create Required EC CMM with the required EC Keys we want
var reqCMM :- expect mpl.CreateRequiredEncryptionContextCMM(
   mplTypes.CreateRequiredEncryptionContextCMMInput(
         underlyingCMM := Some(defaultCMM),
         keyring := None,
         requiredEncryptionContextKeys := requiredEncryptionContextKeys
   )
);

var decryptOutput := esdk.Decrypt(Types.DecryptInput(
   ciphertext := esdkCiphertext,
   materialsManager := Some(reqCMM),
   keyring := None,
   encryptionContext := Some(reproducedAdditionalEncryptionContext)
));

expect decryptOutput.Failure?;
```

### Test MisMatched Encryption Context on Decrypt Failure

Encrypt with and store all encryption context in the message header.
On Decrypt will supply mismatched encryption context that is stored in the header.
This operation MUST fail.

```
// The string "asdf" as bytes
var asdf := [ 97, 115, 100, 102 ];
var aesKeyring := GetAesKeyring();

// Test supply same encryption context on encrypt and decrypt NO filtering
var encryptionContext := map[ keyA := valA, keyB := valB ];
var reproducedAdditionalEncryptionContext := map[ keyA := valB, keyB := valA  ];
var requiredEncryptionContextKeys := [keyA, keyB];

var defaultCMM :- expect mpl.CreateDefaultCryptographicMaterialsManager(
   mplTypes.CreateDefaultCryptographicMaterialsManagerInput(
         keyring := aesKeyring
   )
);

var encryptOutput := esdk.Encrypt(Types.EncryptInput(
   plaintext := asdf,
   encryptionContext := Some(encryptionContext),
   materialsManager := Some(defaultCMM),
   keyring := None,
   algorithmSuiteId := None,
   frameLength := None
));

expect encryptOutput.Success?;
var esdkCiphertext := encryptOutput.value.ciphertext;

// Create Required EC CMM with the required EC Keys we want
var reqCMM :- expect mpl.CreateRequiredEncryptionContextCMM(
   mplTypes.CreateRequiredEncryptionContextCMMInput(
         underlyingCMM := Some(defaultCMM),
         keyring := None,
         requiredEncryptionContextKeys := requiredEncryptionContextKeys
   )
);

var decryptOutput := esdk.Decrypt(Types.DecryptInput(
   ciphertext := esdkCiphertext,
   materialsManager := Some(reqCMM),
   keyring := None,
   encryptionContext := Some(reproducedAdditionalEncryptionContext)
));

expect decryptOutput.Failure?;
```

### Test filter out Encryption Context and DO NOT supply on Decrypt

Encrypt will NOT store all encryption context.
Decrypt will NOT supply reproduced encryption context.
This operation MUST fail.

```
// The string "asdf" as bytes
var asdf := [ 97, 115, 100, 102 ];
var aesKeyring := GetAesKeyring();

// Test supply same encryption context on encrypt and decrypt NO filtering
var encryptionContext := map[ keyA := valA, keyB := valB ];
var requiredEncryptionContextKeys := [keyA, keyB];

var defaultCMM :- expect mpl.CreateDefaultCryptographicMaterialsManager(
   mplTypes.CreateDefaultCryptographicMaterialsManagerInput(
         keyring := aesKeyring
   )
);

// Create Required EC CMM with the required EC Keys we want
var reqCMM :- expect mpl.CreateRequiredEncryptionContextCMM(
   mplTypes.CreateRequiredEncryptionContextCMMInput(
         underlyingCMM := Some(defaultCMM),
         keyring := None,
         requiredEncryptionContextKeys := requiredEncryptionContextKeys
   )
);

var encryptOutput := esdk.Encrypt(Types.EncryptInput(
   plaintext := asdf,
   encryptionContext := Some(encryptionContext),
   materialsManager := Some(reqCMM),
   keyring := None,
   algorithmSuiteId := None,
   frameLength := None
));

expect encryptOutput.Success?;
var esdkCiphertext := encryptOutput.value.ciphertext;

var decryptOutput := esdk.Decrypt(Types.DecryptInput(
   ciphertext := esdkCiphertext,
   materialsManager := Some(defaultCMM),
   keyring := None,
   encryptionContext := None
));

expect decryptOutput.Failure?;
```

### Test filter out Encryption Context and supply mis-matched Encryption Context on Decrypt

Encrypt will not store all encryption context.
Decrypt will supply the correct key but a different value.
This operation MUST fail.

```
// The string "asdf" as bytes
var asdf := [ 97, 115, 100, 102 ];
var aesKeyring := GetAesKeyring();

// Test supply same encryption context on encrypt and decrypt NO filtering
var encryptionContext := map[ keyA := valA, keyB := valB ];
var requiredEncryptionContextKeys := [keyA, keyB];
var mismatchedReproducedEncryptionContext := map[keyA := valB, keyB := valA];

var defaultCMM :- expect mpl.CreateDefaultCryptographicMaterialsManager(
   mplTypes.CreateDefaultCryptographicMaterialsManagerInput(
         keyring := aesKeyring
   )
);

// Create Required EC CMM with the required EC Keys we want
var reqCMM :- expect mpl.CreateRequiredEncryptionContextCMM(
   mplTypes.CreateRequiredEncryptionContextCMMInput(
         underlyingCMM := Some(defaultCMM),
         keyring := None,
         requiredEncryptionContextKeys := requiredEncryptionContextKeys
   )
);

var encryptOutput := esdk.Encrypt(Types.EncryptInput(
   plaintext := asdf,
   encryptionContext := Some(encryptionContext),
   materialsManager := Some(reqCMM),
   keyring := None,
   algorithmSuiteId := None,
   frameLength := None
));

expect encryptOutput.Success?;
var esdkCiphertext := encryptOutput.value.ciphertext;

var decryptOutput := esdk.Decrypt(Types.DecryptInput(
   ciphertext := esdkCiphertext,
   materialsManager := None,
   keyring := Some(aesKeyring)
   encryptionContext := Some(mismatchedReproducedEncryptionContext)
));

expect decryptOutput.Failure?;
```

### Test filter out Encryption Context and supply with missing required value on Decrypt

Encrypt will not store all encryption context.
Decrypt will supply the key-value that is stored but not the one that was dropped.
This operation MUST fail.

```
// The string "asdf" as bytes
var asdf := [ 97, 115, 100, 102 ];
var aesKeyring := GetAesKeyring();

// Test supply same encryption context on encrypt and decrypt NO filtering
var encryptionContext := map[ keyA := valA, keyB := valB ];
var requiredEncryptionContextKeys := [keyA];
var droppedRequiredKeyEncryptionContext := map[ keyB := valB ];

var defaultCMM :- expect mpl.CreateDefaultCryptographicMaterialsManager(
   mplTypes.CreateDefaultCryptographicMaterialsManagerInput(
         keyring := aesKeyring
   )
);

// Create Required EC CMM with the required EC Keys we want
var reqCMM :- expect mpl.CreateRequiredEncryptionContextCMM(
   mplTypes.CreateRequiredEncryptionContextCMMInput(
         underlyingCMM := Some(defaultCMM),
         keyring := None,
         requiredEncryptionContextKeys := requiredEncryptionContextKeys
   )
);

var encryptOutput := esdk.Encrypt(Types.EncryptInput(
   plaintext := asdf,
   encryptionContext := Some(encryptionContext),
   materialsManager := Some(reqCMM),
   keyring := None,
   algorithmSuiteId := None,
   frameLength := None
));

expect encryptOutput.Success?;
var esdkCiphertext := encryptOutput.value.ciphertext;

var decryptOutput := esdk.Decrypt(Types.DecryptInput(
   ciphertext := esdkCiphertext,
   materialsManager := None,
   keyring := Some(aesKeyring)
   encryptionContext := Some(droppedRequiredKeyEncryptionContext)
));

expect decryptOutput.Failure?;
```
