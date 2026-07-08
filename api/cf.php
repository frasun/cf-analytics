<?php
/**
 * Fetch analytics data from CF
 *
 * @package chocante-status
 */

declare( strict_types=1 );

$config = parse_ini_file( dirname( $_SERVER['DOCUMENT_ROOT'] ) . '/.env' );

foreach ( array( 'CF_TOKEN', 'CF_ZONE_TAG', 'CF_ENDPOINT', 'ENV' ) as $key ) {
	if ( empty( $config[ $key ] ) ) {
		http_response_code( 500 );
		echo json_encode( array( 'error' => 'Server misconfiguration' ) );
		exit;
	}
}

// ── CORS ──────────────────────────────────────────────────────────────────────

if ( $config['ENV'] === 'production' ) {
	$scheme      = ( $_SERVER['HTTPS'] ?? '' ) === 'on' ? 'https' : 'http';
	$same_origin = $scheme . '://' . $_SERVER['HTTP_HOST'];

	if ( isset( $_SERVER['HTTP_ORIGIN'] ) && $_SERVER['HTTP_ORIGIN'] === $same_origin ) {
		header( 'Access-Control-Allow-Origin: ' . $same_origin );
	}
} else {
	header( 'Access-Control-Allow-Origin: *' );
}

header( 'Access-Control-Allow-Methods: POST, OPTIONS' );
header( 'Access-Control-Allow-Headers: Content-Type' );

if ( $_SERVER['REQUEST_METHOD'] === 'OPTIONS' ) {
	http_response_code( 204 );
	exit;
}

if ( $_SERVER['REQUEST_METHOD'] !== 'POST' ) {
	http_response_code( 405 );
	header( 'Allow: POST, OPTIONS' );
	echo json_encode( array( 'error' => 'Method not allowed' ) );
	exit;
}

header( 'Content-Type: application/json' );

// ── Input validation ──────────────────────────────────────────────────────────

$raw   = file_get_contents( 'php://input' );
$input = json_decode( $raw, true );

if ( json_last_error() !== JSON_ERROR_NONE ) {
	http_response_code( 400 );
	echo json_encode( array( 'error' => 'Invalid JSON body' ) );
	exit;
}

$from = $input['from'] ?? null;
$to   = $input['to'] ?? null;

if ( ! $from || ! $to ) {
	http_response_code( 400 );
	echo json_encode( array( 'error' => 'Missing required fields: from, to' ) );
	exit;
}

$from_ts = strtotime( $from );
$to_ts   = strtotime( $to );

if ( ! $from_ts || ! $to_ts ) {
	http_response_code( 400 );
	echo json_encode( array( 'error' => 'Invalid date format for from/to' ) );
	exit;
}

if ( $from_ts >= $to_ts ) {
	http_response_code( 400 );
	echo json_encode( array( 'error' => '"from" must be earlier than "to"' ) );
	exit;
}

$from_iso = gmdate( 'Y-m-d\TH:i:s\Z', $from_ts );
$to_iso   = gmdate( 'Y-m-d\TH:i:s\Z', $to_ts );

// ── Cloudflare GraphQL query (using variables — no interpolation) ──────────────

$body = json_encode(
	array(
		'query'     => '
		query GetRequests($zoneTag: String!, $from: String!, $to: String!) {
		  viewer {
		    zones(filter: { zoneTag: $zoneTag }) {
		      httpRequestsAdaptive(
		        filter: {
		          datetime_geq: $from
		          datetime_leq: $to
		          clientRequestPath: "/"
		        }
		        orderBy: [datetime_ASC]
		        limit: 10000
		      ) {
		        datetime
		        clientRequestQuery
		        originResponseDurationMs
		      }
		    }
		  }
		}
	',
		'variables' => array(
			'zoneTag' => $config['CF_ZONE_TAG'],
			'from'    => $from_iso,
			'to'      => $to_iso,
		),
	)
);

// ── cURL ──────────────────────────────────────────────────────────────────────

$ch = curl_init( $config['CF_ENDPOINT'] );

curl_setopt_array(
	$ch,
	array(
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_POST           => true,
		CURLOPT_POSTFIELDS     => $body,
		CURLOPT_HTTPHEADER     => array(
			'Content-Type: application/json',
			'Authorization: Bearer ' . $config['CF_TOKEN'],
		),
		CURLOPT_TIMEOUT        => 15,
		CURLOPT_SSL_VERIFYPEER => true,
	)
);

$response    = curl_exec( $ch );
$curl_err    = curl_error( $ch );
$http_status = curl_getinfo( $ch, CURLINFO_HTTP_CODE );
curl_close( $ch );

// ── Response ──────────────────────────────────────────────────────────────────

if ( $curl_err ) {
	http_response_code( 503 );
	echo json_encode(
		array(
			'error'  => 'Upstream unavailable',
			'detail' => $curl_err,
		)
	);
	exit;
}

if ( $http_status !== 200 ) {
	http_response_code( 502 );
	echo json_encode(
		array(
			'error'  => 'Upstream error',
			'status' => $http_status,
		)
	);
	exit;
}

$decoded = json_decode( $response, true );

if ( ! empty( $decoded['errors'] ) ) {
	http_response_code( 502 );
	echo json_encode(
		array(
			'error'  => 'GraphQL error',
			'detail' => $decoded['errors'],
		)
	);
	exit;
}

$request_data    = $decoded['data']['viewer']['zones'][0]['httpRequestsAdaptive'] ?? array();
$filtered_by_atc = array_filter(
	$request_data,
	fn( $item ) => '?wc-ajax=add_to_cart' === $item['clientRequestQuery'] && $item['originResponseDurationMs'] > 0
);
$data            = array_map( fn( $item ) => array_diff_key( $item, array( 'clientRequestQuery' => '' ) ), $filtered_by_atc );

echo json_encode( array_values( $data ) );
