
# Tractor

A programming language by Jack Eisenmann

## Motivation

When creating the [WheatSystem C implementation](https://github.com/ostracod/wheatsystem-c), I wanted the codebase to be compatible with a variety of target platforms, including:

* Unix-like platforms (for debugging purposes)
* AVR microcontrollers
* PIC microcontrollers
* Microprocessors such as the 6502 and Z80

I encountered several difficulties along the way:

* C macros can't really accept macro functions as arguments. I needed to do this to define certain generic functions. I accomplished this by creating a **pre**preprocessor, but the solution was ugly.
* C macros do not have any type signature, which leads to confusion. I made an ad-hoc documentation system to annotate my macro definitions, but the solution was ugly.
* C doesn't have native support for generic types. I needed this for custom pointer types and non-volatile array data. I used my prepreprocessor to trick C into supporting generic types, but the solution was ugly.
* C is picky about the order of definitions. I was able to circumvent this problem by separating type definitions and function definitions in my build process, but the solution was ugly.
* C does not support the `typeof` construct or expression statements in the official specification. This is not a problem when using gcc, but compilers for the PIC microcontroller do not support statement expressions. I could have reworked my code to remove statement expressions, but the solution was going to be ugly.

Given all of these ugly solutions, I decided that C was not a good language for implementing WheatSystem. 

I considered using Rust as an alternative language, because it would resolve many of these problems. However, Rust cannot compile for PIC microcontrollers at this time. I imagine it would take a lot of effort to add PIC support to LLVM, as well as additional architectures I might want to use.

At this point, I decided to design a systems language which would compile into C code. The language would only need enough features to implement WheatSystem, so I could create a relatively simple specification. I named the programming language Tractor.

## Design Goals

* Easy to parse
* Rugged aesthetic
* Support for generic types
* Interchangeable import files
* Interoperability with foreign code
* Compile into C code or assembly code

## Types

Tractor has the following built-in primitive types:

* `u8`, `u16`, `u32`, and `u64` are unsigned integers.
* `s8`, `s16`, `s32`, and `s64` are signed integers.
* `type` is the metatype representing all types.

Tractor has the following built-in composite types:

* `const(<type>)` is an immutable value with type `<type>`. For example, `const(u8)` is an immutable unsigned 8-bit integer.
* `ptr(<type>)` is a native pointer to a value with type `<type>`. For example, `ptr(u8)` is a pointer to an unsigned 8-bit integer.
* `array(<type>, <length>)` is an array of values with type `<type>` and length `<length>`. For example, `array(u8, 10)` is an array of ten unsigned 8-bit integers.

## Value Literals

Tractor has the following built-in primitive value literals:

* `TRUE` and `FALSE` are the boolean value literals.
* `NULL` is the null pointer value literal.
* A decimal integer value literal consists of a sequence of decimal digits. For example, `18` is the integer 18.
* A hexadecimal integer value literal begins with `0x` followed by a sequence of hexadecimal digits. For example, `0x12` is the integer 18.
* A character integer value literal consists of an ASCII character enclosed by apostrophes. For example, `'A'` is the integer 65.

Tractor has the following built-in composite value literals:

* A string value literal consists of a sequence of ASCII characters enclosed by quotation marks. For example, `"Hello"` is an array containing the unsigned 8-bit integers 72, 101, 108, 108, and 111.
* An array value literal has the format `{<value>, <value>, <value>...}:<arrayType>`. For example, `{10, 20, 30}:array(u8)` is an array containing the unsigned 8-bit integers 10, 20, and 30.
* A struct value literal has the format `{<value>, <value>, <value>...}:<structType>`, where each `<value>` is a field value of the struct. For example, `{45, 60}:myStructType` is a struct of type `myStructType` whose field values are 45 and 60.

## Expressions

Tractor has the following unary and binary operators:

* `+`, `-`, `*`, `/`, and `%` perform arithmetic operations.
* `~`, `&`, `|`, `^`, `>>`, and `<<` perform bitwise operations.
* `!`, `&&`, `||`, and `^^` perform boolean operations.
* `==`, `!=`, `>`, `>=`, `<` and `<=` perform comparison operations.

Tractor has the following assignment operators:

* `=` performs assignment.
* `+=`, `-=`, `*=`, `/=`, `%=` perform assignment with arithmetic manipulation.
* `&=`, `|=`, `^=`, `>>=`, and `<<=` perform assignment with bitwise manipulation.
* `&&=`, `||=`, and `^^=` perform assignment with boolean manipulation.

Parentheses manipulate order of operations. For example, the expression `2 * (3 + 4)` performs addition before multiplication, so the result is 14 instead of 10.

The expression `<value>:<type>` casts value `<value>` to type `<type>`. For example, the expression `10:s32` returns 10 as a signed 32-bit integer.

The expression `<array>[<index>]` accesses the element in array `<array>` with index `<index>`. For example, the expression `myArray[3]` accesses the fourth value of `myArray`.

The expression `<struct>.<name>` accesses the field in struct `<struct>` with name `<name>`. For example, the expression `myStruct.x` retrieves the field with name `x` in `myStruct`.

Function invocation has the format `<function>(<value>, <value>, <value>...)`, where each `<value>` is an argument value of the invocation. For example, the expression `myFunction(10, 20)` invokes `myFunction` with argument values 10 and 20.


