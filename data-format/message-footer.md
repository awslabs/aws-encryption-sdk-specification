[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Footer Structure

## Version

See [Message Version](message.md#version).

## Overview

The footer is a component of the [message](message.md).  
When an [algorithm suite](../framework/algorithm-suites.md) includes a [signature algorithm](../framework/algorithm-suites.md#signature-algorithm),
the [message](message.md) MUST contain a footer.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Structure

The following table is a non-normative representation of the normative requirements in this section.
The bytes are appended in the order shown.

| Field            | Length (bytes) | Interpreted as |
| ---------------- | -------------- | -------------- |
| Signature Length | 2              | UInt16         |
| Signature        | Variable.      | Bytes          |

The message footer MUST consist of, in order,
Signature Length,
and Signature.

### Signature Length

The length of the signature.
The length of the signature length field MUST be 2 bytes.
The signature length value MUST be a UInt16.

### Signature

The [signature](../framework/algorithm-suites.md#signature-algorithm) used to authenticate the message.  
This signature MUST be calculated over both the [message header](message-header.md) and the [message body](message-body.md),
in the order of serialization.  
The [algorithm suite](../framework/algorithm-suites.md) specified by the [Algorithm Suite ID](../framework/algorithm-suites.md#algorithm-suite-id) field
[determines how the value of this field is calculated](../client-apis/encrypt.md),
and uses this value to [authenticate the contents of the header and body during decryption](../client-apis/decrypt.md).
The signature MUST be interpreted as bytes.

## Example Usage

The following section contains examples of the footer.

### Example Pseudo-ASN.1 Structure

```
DEFINITIONS ::= BEGIN
Footer SEQUENCE (SIZE(2)) {
    SignatureLength UINT16,
    Signature OCTET STRING (SIZE(SignatureLength)),
}
```

### Example Bytes

```
0067                                     Signature Length (103)
30650230 7229DDF5 B86A5B64 54E4D627      Signature
CBE194F1 1CC0F8CF D27B7F8B F50658C0
BE84B355 3CED1721 A0BE2A1B 8E3F449E
1BEB8281 023100B2 0CB323EF 58A4ACE3
1559963B 889F72C3 B15D1700 5FB26E61
331F3614 BC407CEE B86A66FA CBF74D9E
34CB7E4B 363A38
```
