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

With the addition of the [required encryption context cmm](../../framework/required-encryption-context-cmm.md),
the `encrypt` API is able to filter out encryption context key-value pairs that
are not stored on the message.

`decrypt` returns Encryption Context.
We were able to satisfy this requirement by returning the parsed message header.
This is no longer adequate as the header may not contain all Encryption Context values used to
authenticate the message.

Currently, `decrypt` takes in optional encryption context.
This optional encryption context MAY not be stored in the message header, but is still authenticated.

If `decrypt` uses [encryption context to only authenticate](../../client-apis/decrypt.md#encryption-context-to-only-authenticate)
to successfully decrypt a message, then the encryption context output
MUST be the union of the encryption context serialized into the message header and
the [encryption context for authentication only](#encryption-context-to-only-authenticate), if available. 


### Can you construct message that stores different encryption context than the encryption context returned by a CMM?

None of the built-in implementations of the [CMM interface](../../framework/cmm-interface.md)
modify the encryption context on DecryptMaterials.

However, the CMMs DecryptMaterials is allowed to modify the encryption context on decrypt.
A poorly designed CMM could theoretically return materials with an "incorrect" encryption context
that contradicts the encryption context in the header of the message.

The `decrypt` API SHOULD not check if the encryption context that was stored on the message matches
what it receives from the CMMs DecryptMaterials because the current implementation
of the `encrypt` API used with the built-in CMMs is not able to write a message 
that on `decrypt` the CMM returns "incorrect" encryption context that contradicts 
the encryption context stored in the header of the message.

### What changes to the existing Required Encryption Context CMM are required?

None

### What changes to the existing Cryptographic Materials Manager Interface are required?

None

## Testing

In order to test that decrypt behaves as expected according to the specification, testing should include the following
scenarios to accurately reason about the behavior of using the Required Encryption Context CMM.

To test the new encryption context (EC) features
the following dimensions exists:

* Stored EC -- EC stored in the header
* Not stored EC -- EC authenticated to the header but not stored
* CMM Material EC -- EC on the decryption material
* Required keys -- Keys for the EC that MAY be only authenticated
* Reproduced EC -- EC passed on decrypt

Given the EC `{ a: a, b: b }`
we break this into the following interesting options:

Stored EC/Not Stored EC
* `{a: a, b: b}` / `{}`
* `{a: a}` / `{b: b}`
* `{}` / `{a: a, b: b}`

CMM Material/Required Keys
* `{a: a, b: b}` / `{}`
* `{a: a, b: b}` / `{a}`
* `{a: a, b: b}` / `{a,b}`
* `{a: a, b: c}` / `{a}`
* `{a: a, b: b}` / `{c}`

Reproduced EC
* `{}`
* `{ a: a }`
* `{ b: b }`
* `{ a: a, b: b }`
* `{ a: c }`
* `{ b: c }`
* `{ a: c, b: b }`
* `{ a: c, b: c }`
* `{ c: c }`
* `{ a: a, c: c }`
* `{ b: b, c: c}`
* `{ a: a, b: b, c: c }`


### Message: `{a: a, b: b}` / `{}`

CMM Material/Required Keys &rarr; <br/>Reproduced EC &darr; | `{a: a, b: b}` / `{}` |  `{a: a, b: b}` / `{a}`|  `{a: a, b: b}` / `{a,b}`| `{a: a, b: c}` / `{a}` | `{a: a, b: b}` / `{c}` |
------------------------------------------------------------|-----------------------|------------------------|--------------------------|------------------------|------------------------|
`{}`                                                        |         pass          |         fail           |          fail            |          fail          |           fail         |
`{ a: a }`                                                  |         pass          |         pass           |          fail            |          fail          |           fail         |
`{ b: b }`                                                  |         pass          |         pass           |          fail            |          fail          |           fail         |
`{ a: a, b: b }`                                            |         pass          |         pass           |          pass            |          fail          |           fail         |
`{ a: c }`                                                  |         fail          |         fail           |          fail            |          fail          |           fail         |
`{ b: c }`                                                  |         fail          |         fail           |          fail            |          fail          |           fail         |
`{ a: c, b: b }`                                            |         fail          |         fail           |          fail            |          fail          |           fail         |
`{ a: c, b: c }`                                            |         fail          |         fail           |          fail            |          fail          |           fail         |
`{ c: c }`                                                  |         fail          |         fail           |          fail            |          fail          |           fail         |
`{ a: a, c: c }`                                            |         fail          |         fail           |          fail            |          fail          |           fail         |
`{ b: b, c: c}`                                             |         fail          |         fail           |          fail            |          fail          |           fail         |
`{ a: a, b: b, c: c }`                                      |         fail          |         fail           |          fail            |          fail          |           fail         |      

### Message: `{a: a}` / `{b: b}`

CMM Material/Required Keys &rarr; <br/>Reproduced EC &darr; | `{a: a, b: b}` / `{}` |  `{a: a, b: b}` / `{a}`|  `{a: a, b: b}` / `{a,b}`| `{a: a, b: c}` / `{a}` | `{a: a, b: b}` / `{c}` |
------------------------------------------------------------|-----------------------|------------------------|--------------------------|------------------------|------------------------|
`{}`                                                        |         fail          |           fail         |         fail             |        fail            |          fail          |
`{ a: a }`                                                  |         fail          |           fail         |         fail             |        fail            |          fail          |
`{ b: b }`                                                  |         pass          |           fail         |         fail             |        fail            |          fail          |
`{ a: a, b: b }`                                            |         pass          |           pass         |         pass             |        pass            |          fail          |
`{ a: c }`                                                  |         fail          |           fail         |         fail             |        fail            |          fail          |
`{ b: c }`                                                  |         fail          |           fail         |         fail             |        fail            |          fail          |
`{ a: c, b: b }`                                            |         fail          |           fail         |         fail             |        fail            |          fail          |
`{ a: c, b: c }`                                            |         fail          |           fail         |         fail             |        fail            |          fail          |
`{ c: c }`                                                  |         fail          |           fail         |         fail             |        fail            |          fail          |
`{ a: a, c: c }`                                            |         fail          |           fail         |         fail             |        fail            |          fail          |
`{ b: b, c: c}`                                             |         fail          |           fail         |         fail             |        fail            |          fail          |
`{ a: a, b: b, c: c }`                                      |         fail          |           fail         |         fail             |        fail            |          fail          |      

### Message:`{}` / `{a: a, b: b}`

CMM Material/Required Keys &rarr; <br/>Reproduced EC &darr; | `{a: a, b: b}` / `{}` |  `{a: a, b: b}` / `{a}`|  `{a: a, b: b}` / `{a,b}`| `{a: a, b: c}` / `{a}` | `{a: a, b: b}` / `{c}` |
------------------------------------------------------------|-----------------------|------------------------|--------------------------|------------------------|------------------------|
`{}`                                                        |         fail          |          fail          |           fail           |           fail         |          fail          |
`{ a: a }`                                                  |         fail          |          pass          |           fail           |           fail         |          fail          |
`{ b: b }`                                                  |         fail          |          fail          |           fail           |           fail         |          fail          |
`{ a: a, b: b }`                                            |         pass          |          fail          |           pass           |           fail         |          fail          |
`{ a: c }`                                                  |         fail          |          fail          |           fail           |           fail         |          fail          |
`{ b: c }`                                                  |         fail          |          fail          |           fail           |           fail         |          fail          |
`{ a: c, b: b }`                                            |         fail          |          fail          |           fail           |           fail         |          fail          |
`{ a: c, b: c }`                                            |         fail          |          fail          |           fail           |           fail         |          fail          |
`{ c: c }`                                                  |         fail          |          fail          |           fail           |           fail         |          fail          |
`{ a: a, c: c }`                                            |         fail          |          fail          |           fail           |           fail         |          fail          |
`{ b: b, c: c}`                                             |         fail          |          fail          |           fail           |           fail         |          fail          |
`{ a: a, b: b, c: c }`                                      |         fail          |          fail          |           fail           |           fail         |          fail          |      