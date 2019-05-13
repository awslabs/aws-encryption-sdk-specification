# Footer Structure

## Overview 

When the [algorithms with signing](#TODO) are used, the [message format](#TODO) contains a footer.  
The message footer contains a signature calculated over the message [header](#TODO) and [body](#TODO) and is used to authenticate the message.  
The following table describes the fields that form the footer.  
The bytes are appended in the order shown. 

## Structure

| Field                    | Length in bytes                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Signature Length         | 2                                                                                          |
| Signature                | Variable. Equal to the value specified in the previous 2 bytes (Signature Length).         |

### Signature Length

The length of the signature.  
It is a 2-byte value interpreted as a 16-bit unsigned integer that specifies the number of bytes that contain the signature.

### Signature

The signature. It is used to authenticate the header and body of the message.


## Example Usage 

The example below shows the raw bytes of the footer, in hexadecimal notation, followed by a description of what those bytes represent. 

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

## Implementation Details 

[C](https://github.com/awslabs/aws-encryption-sdk-c/blob/master/source/session_encrypt.c#L338)
[Java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/model/CiphertextFooters.java)
[Python](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/internal/structures.py)
