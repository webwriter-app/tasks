/** A GIFT file as Moodle writes it: a category, comments, a description, and one question of each supported type. */
export const sampleGift = String.raw`// Sample export
$CATEGORY: $course$/top/Geography

Read the next questions carefully.

::Capital:: What is the capital of France? {=Paris ~Rome ~Berlin}

Which of these are prime numbers? {
	~%50%2
	~%50%7
	~%-100%9
}

::Round:: The Earth is flat. {F}

Who wrote \{Faust\}\: a drama? {=Goethe}

How many legs does a spider have? {#8}

Explain the water cycle. {}

Match the country with its capital. {
	=France -> Paris
	=Italy -> Rome
	=Spain -> Madrid
}

The {=cat} sat on the {=mat}.
`;
