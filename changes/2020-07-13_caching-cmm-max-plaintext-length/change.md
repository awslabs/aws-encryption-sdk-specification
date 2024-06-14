[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Enforce Safe Handling of Max Plaintext Length in Caching Cryptographic Materials Manager

## Affected Features

| Feature                                                                   |
| ------------------------------------------------------------------------- |
| [Caching Cryptographic Materials Manager](../../framework/caching-cmm.md) |

## Affected Specifications

| Specification                                                             |
| ------------------------------------------------------------------------- |
| [Caching Cryptographic Materials Manager](../../framework/caching-cmm.md) |

## Affected Implementations

| Language   | Repository                                                                            |
| ---------- | ------------------------------------------------------------------------------------- |
| C          | [aws-encryption-sdk-c](https://github.com/aws/aws-encryption-sdk-c)                   |
| Java       | [aws-encryption-sdk-java](https://github.com/aws/aws-encryption-sdk-java)             |
| JavaScript | [aws-encryption-sdk-javascript](https://github.com/aws/aws-encryption-sdk-javascript) |
| Python     | [aws-encryption-sdk-python](https://github.com/aws/aws-encryption-sdk-python)         |

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

The Get Encryption Materials operation accepts an optional `max plaintext length` parameter,
but the specification does not state
how the caching Cryptographic Materials Manager (caching CMM)
should behave when the caller does not provide the parameter value.
This change specifies that the caching CMM MUST bypass the cache in this case.

Also, when the caching CMM is performing a Get Encryption Materials operation
for which no materials are cached,
it MUST call its underlying CMM's Get Encryption Materials operation.
The specification does not state what value of `max plaintext length` (if any)
the caching CMM should pass to its underlying CMM.
This change specifies that the caching CMM MUST pass its `byte limit` value
as the `max plaintext length` parameter of the call to the underlying CMM.

## Out of Scope

- Changing the shape of any CMM APIs is out of scope.

## Motivation

### Fulfulling Encryption Materials Requests Without `max plaintext length`

The Get Encryption Materials operation of the CMM
accepts an Encryption Materials Request that MUST optionally include a `max plaintext length` field,
indicating the maximum length of plaintext
that the caller intends to encrypt using the returned materials.
The caching CMM aims to prevent its users from using encryption materials
to encrypt more bytes than its configured `byte limit`,
and existing implementations do so by bypassing the cache
whenever it does not know the `max plaintext length`.
This behavior is safe but previously unspecified,
and this change mandates that implementations implement it.

### Setting `max plaintext length` for Underlying CMM's Get Encryption Materials

The CMM interface specification implicitly allows an underlying CMM
to produce encryption materials using logic
that depends on the `max plaintext length` of an Encryption Materials Request.
Suppose the caching CMM passes a `max plaintext length` value of `N`
to its underlying CMM's Get Encryption Materials operation,
and caches the materials that it receives.
This signals to the underlying CMM that it intends to use the materials
to _only_ encrypt up to `N` bytes.
If a later Get Encryption Materials operation has a `max plaintext length` greater than `N`,
and if the caching CMM returns the cached materials,
then the user may use the materials to encrypt _more_ than `N` bytes.
The caching CMM violates its prior intent, which is unsafe.

It is therefore important that the caching CMM
carefully selects the `max plaintext length` parameter to pass to its underlying CMM.
This change mandates that the caching CMM passes its configured `byte limit` value
as the `max plaintext length` parameter to the underlying CMM,
whereas previously, the caching CMM could choose any value.
With this change in place,
even if the underlying CMM produces materials using plaintext-length-dependent logic,
the caching CMM receives and caches materials
that are safe to use for up to `byte limit` bytes of plaintext.
It follows that if a later Get Encryption Materials operation's `max plaintext length`
does not exceed the remaining number of bytes for which the cached materials can be safely used
(i.e.,
the difference between the caching CMM's `byte limit`
and the sum of `max plaintext length` values from past uses of the cached materials),
then it is also safe for the caching CMM to return the cached materials.

## Drawbacks

Bypassing the cache in the caching CMM on Get Encryption Materials operations
that do not specify `max plaintext length`
could be confusing to the user.
Warning the user when this happens could help prevent users from running into
unexpected (and potentially expensive) calls to the underlying CMM,
but we leave this as an implementation choice.

## Security Implications

This change SHOULD NOT have any security implications.

## Operational Implications

This change will break any customer use case
that depends on the Caching CMM passing no `max plaintext length` parameter
to the underlying CMM on Get Encryption Materials calls.

## Guide-level Explanation

When making a Get Encryption Materials call to the caching CMM,
the user may optionally specify a value for the `max plaintext length` parameter,
which indicates the maximum number of bytes the user intends to encrypt
with the materials received from the call.
If the user does not specify a `max plaintext length` value,
then the caching CMM will neither use cached materials
nor cache materials from its underlying CMM.
This helps to ensure that the number of bytes encrypted with the materials
does not exceed the `byte limit` that the user configures on the caching CMM,
while also maximizing the benefits of caching.
So whenever the user can determine an appropriate upper bound for bytes they will encrypt,
they should specify the `max plaintext length` value.

If the user customizes the underlying CMM of a caching CMM,
then whenever the caching CMM makes a Get Encryption Materials call
to the customized underlying CMM,
the Encryption Materials Request will have a `max plaintext length` value
equal to the `byte limit` value configured on the caching CMM.
This helps to ensure that the caching CMM can safely cache materials
that it receives from the customized underlying CMM.

## Reference-level Explanation

When the caching CMM is performing the Get Encryption Materials operation
for an Encryption Materials Request that does not specify a `max plaintext length`,

- The caching CMM MUST NOT return materials from its CMC.
- If the caching CMM calls its underlying CMM's Get Encryption Materials operation
  in order to obtain encryption materials,
  it MUST NOT cache the encryption materials in its CMC.

When the caching CMM calls its underlying CMM's Get Encryption Materials operation
in order to obtain encryption materials,
it MUST use its configured `byte limit` value
as the `max plaintext length` field of the Encryption Materials Request
that it sends to the underlying CMM.
