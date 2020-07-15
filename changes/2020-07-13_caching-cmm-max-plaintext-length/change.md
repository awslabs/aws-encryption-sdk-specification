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
but the specification does not state how the caching CMM should behave
when the caller does not provide the parameter value.
This change specifies that the caching CMM should bypass the cache in this case.

Also, when the caching CMM is performing a Get Encryption Materials operation
for which no materials are cached,
it MUST call its underlying CMM's Get Encryption Materials operation.
The specification does not state what value of `max plaintext length` (if any)
the caching CMM should pass to its underlying CMM.
This change specifies that the caching CMM should pass its `byte limit` value
as the `max plaintext length` parameter of the call to the underlying CMM.

## Out of Scope

- Changing the shape of any CMM APIs is out of scope.

## Motivation

### Fulfulling Encryption Materials Requests Without `max plaintext length`

The Get Encryption Materials operation of the Cryptographic Materials Manager (CMM)
accepts an Encryption Materials Request that MAY specify a `max plaintext length` field,
indicating the maximum length of plaintext
that the caller intends to encrypt using the returned materials.
The caching Cryptographic Materials Manager (caching CMM)
aims to prevent its users from using encryption materials
to encrypt more bytes than its configured `byte limit`,
and existing implementations do so by bypassing the cache
whenever it does not know their users' `max plaintext length`.
This behavior is safe but previously unspecified,
and this change mandates that implementations implement it.

### Setting `max plaintext length` for Underlying CMM's Get Encryption Materials

The CMM interface specification implicitly allows an underlying CMM
to produce encryption materials using logic
that depends on the `max plaintext length` of its Encryption Materials Request.
Suppose the caching CMM passes a `max plaintext length` value of `N`
to its underlying CMM's Get Encryption Materials operation,
and caches the materials that it receives.
If a later Get Encryption Materials operation fetches those materials from the cache,
but has a `max plaintext length` value that exceeds `N`,
then the caching CMM returns those materials unsafely.

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
does not exceed the caching CMM's `byte limit`,
then it is also safe for the caching CMM to return corresponding cached materials.

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

When you make a Get Encryption Materials call to the caching CMM,
you may optionally specify a value for the `max plaintext length` parameter,
which indicates the maximum number of bytes you will encrypt
with the materials you receive from the call.
If you do not specify a `max plaintext length` value,
then the caching CMM will neither use cached materials
nor cache materials from its underlying CMM.
This helps to ensure that you do not exceed the `byte limit`
that you configure on the caching CMM.
So in order to maximize the benefits of caching,
you should specify the `max plaintext length` value
whenever you know an appropriate upper bound for bytes you will encrypt.

If you customize the underlying CMM of a caching CMM,
then whenever the caching CMM makes a Get Encryption Materials call
to your customized underlying CMM,
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
