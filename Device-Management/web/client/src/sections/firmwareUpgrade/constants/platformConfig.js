export const MAX_PLATFORM_CONFIG_LENGTH = 5;

const isValidConfigLength = (value) =>
  Number.isInteger(value) && value >= 1 && value <= MAX_PLATFORM_CONFIG_LENGTH;

const getConfigLength = (configuredLength, fallback) =>
  isValidConfigLength(configuredLength) ? configuredLength : fallback;

/**
 * Reads the maximum number of TCP configurations from the platform group in
 * a parameter-template schema. Templates created before tcpConfigLength was
 * introduced retain their caller-provided fallback behaviour.
 */
export const getTcpConfigLength = (
  group,
  fallback = MAX_PLATFORM_CONFIG_LENGTH,
) => getConfigLength(group?.tcpConfigLength, fallback);

/**
 * Reads the maximum number of MQTT connections from the platform group in a
 * parameter-template schema. MQTT connection entries, rather than their
 * nested publish/subscribe topics, are limited by mqttConfigLength.
 */
export const getMqttConfigLength = (
  group,
  fallback = MAX_PLATFORM_CONFIG_LENGTH,
) => getConfigLength(group?.mqttConfigLength, fallback);
