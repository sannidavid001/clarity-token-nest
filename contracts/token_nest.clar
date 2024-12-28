;; TokenNest Contract
;; A system for managing tokenized assets

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))

;; Define token
(define-fungible-token asset-token)

;; Data structures
(define-map assets
    { asset-id: uint }
    {
        owner: principal,
        name: (string-ascii 64),
        symbol: (string-ascii 10),
        metadata-uri: (string-utf8 256),
        total-supply: uint
    }
)

(define-data-var next-asset-id uint u1)

;; Read only functions
(define-read-only (get-asset-info (asset-id uint))
    (match (map-get? assets { asset-id: asset-id })
        asset (ok asset)
        err-not-found
    )
)

(define-read-only (get-balance (account principal))
    (ok (ft-get-balance asset-token account))
)

;; Public functions
(define-public (create-asset (name (string-ascii 64)) (symbol (string-ascii 10)) (metadata-uri (string-utf8 256)) (initial-supply uint))
    (let
        (
            (asset-id (var-get next-asset-id))
        )
        (try! (ft-mint? asset-token initial-supply tx-sender))
        (map-set assets
            { asset-id: asset-id }
            {
                owner: tx-sender,
                name: name,
                symbol: symbol,
                metadata-uri: metadata-uri,
                total-supply: initial-supply
            }
        )
        (var-set next-asset-id (+ asset-id u1))
        (ok asset-id)
    )
)

(define-public (transfer (amount uint) (sender principal) (recipient principal))
    (begin
        (try! (ft-transfer? asset-token amount sender recipient))
        (ok true)
    )
)

(define-public (mint (asset-id uint) (amount uint) (recipient principal))
    (let
        (
            (asset (unwrap! (map-get? assets { asset-id: asset-id }) err-not-found))
        )
        (asserts! (is-eq tx-sender (get owner asset)) err-owner-only)
        (try! (ft-mint? asset-token amount recipient))
        (ok true)
    )
)

(define-public (update-metadata (asset-id uint) (new-uri (string-utf8 256)))
    (let
        (
            (asset (unwrap! (map-get? assets { asset-id: asset-id }) err-not-found))
        )
        (asserts! (is-eq tx-sender (get owner asset)) err-unauthorized)
        (map-set assets
            { asset-id: asset-id }
            (merge asset { metadata-uri: new-uri })
        )
        (ok true)
    )
)