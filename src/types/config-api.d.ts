interface Api {
	remapResponse: (string, ApiResponseBody) => ApiResponseBody
	remapSource: (TableRoutingParams) => string
}
