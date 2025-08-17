 
;; CaregiverProfile Contract
;; Clarity v2
;; Manages caregiver profiles including details, certifications, experience, availability, and reputation.
;; Allows registration, updates, verification, and reputation management with access controls.

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-PROFILE-EXISTS u101)
(define-constant ERR-PROFILE-NOT-FOUND u102)
(define-constant ERR-INVALID-INPUT u103)
(define-constant ERR-NOT-VERIFIED u104)
(define-constant ERR-ALREADY-VERIFIED u105)
(define-constant ERR-MAX-CERTIFICATIONS u106)
(define-constant ERR-PAUSED u107)
(define-constant ERR-ZERO-ADDRESS u108)
(define-constant ERR-INVALID-REPUTATION u109)

;; Constants for limits and metadata
(define-constant MAX-CERTIFICATIONS u10)
(define-constant MAX-NAME-LENGTH u50)
(define-constant MAX-BIO-LENGTH u500)
(define-constant MAX_CERT_LENGTH u100)
(define-constant CONTRACT-NAME "CaregiverProfile")

;; Admin and state variables
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var reputation-updater (optional principal) none) ;; Contract that can update reputation, e.g., ServiceAgreement

;; Profile map: principal -> profile tuple
(define-map profiles principal
  {
    name: (string-ascii 50),
    bio: (buff 500),
    experience-years: uint,
    certifications: (list 10 (string-ascii 100)),
    is-available: bool,
    reputation-score: uint,
    review-count: uint,
    is-verified: bool,
    last-updated: uint ;; block height
  }
)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: validate string lengths
(define-private (validate-string-ascii (str (string-ascii 256)) (max-len uint))
  (if (<= (len str) max-len)
    (ok true)
    (err ERR-INVALID-INPUT)
  )
)

(define-private (validate-buff (b (buff 1024)) (max-len uint))
  (if (<= (len b) max-len)
    (ok true)
    (err ERR-INVALID-INPUT)
  )
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin tx-sender)) (err ERR-ZERO-ADDRESS)) ;; Prevent self-transfer or zero
    (var-set admin new-admin)
    (print { event: "admin-transferred", new-admin: new-admin })
    (ok true)
  )
)

;; Set reputation updater contract
(define-public (set-reputation-updater (updater (optional principal)))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set reputation-updater updater)
    (print { event: "reputation-updater-set", updater: updater })
    (ok true)
  )
)

;; Pause/unpause the contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (print { event: "paused-set", pause: pause })
    (ok pause)
  )
)

;; Register a new profile
(define-public (register-profile (name (string-ascii 50)) (bio (buff 500)) (experience-years uint) (certifications (list 10 (string-ascii 100))) (is-available bool))
  (begin
    (ensure-not-paused)
    (asserts! (is-none (map-get? profiles tx-sender)) (err ERR-PROFILE-EXISTS))
    (try! (validate-string-ascii name MAX-NAME-LENGTH))
    (try! (validate-buff bio MAX-BIO-LENGTH))
    (asserts! (<= (len certifications) MAX-CERTIFICATIONS) (err ERR-MAX-CERTIFICATIONS))
    (map-set profiles tx-sender
      {
        name: name,
        bio: bio,
        experience-years: experience-years,
        certifications: certifications,
        is-available: is-available,
        reputation-score: u0,
        review-count: u0,
        is-verified: false,
        last-updated: block-height
      }
    )
    (print { event: "profile-registered", owner: tx-sender })
    (ok true)
  )
)

;; Update profile details (only owner)
(define-public (update-profile (name (optional (string-ascii 50))) (bio (optional (buff 500))) (experience-years (optional uint)) (is-available (optional bool)))
  (begin
    (ensure-not-paused)
    (let ((profile-opt (map-get? profiles tx-sender)))
      (asserts! (is-some profile-opt) (err ERR-PROFILE-NOT-FOUND))
      (let ((profile (unwrap! profile-opt (err ERR-PROFILE-NOT-FOUND))))
        (if (is-some name) (try! (validate-string-ascii (unwrap! name (err ERR-INVALID-INPUT)) MAX-NAME-LENGTH)) (ok true))
        (if (is-some bio) (try! (validate-buff (unwrap! bio (err ERR-INVALID-INPUT)) MAX-BIO-LENGTH)) (ok true))
        (map-set profiles tx-sender
          {
            name: (default-to (get name profile) name),
            bio: (default-to (get bio profile) bio),
            experience-years: (default-to (get experience-years profile) experience-years),
            certifications: (get certifications profile),
            is-available: (default-to (get is-available profile) is-available),
            reputation-score: (get reputation-score profile),
            review-count: (get review-count profile),
            is-verified: (get is-verified profile),
            last-updated: block-height
          }
        )
        (print { event: "profile-updated", owner: tx-sender })
        (ok true)
      )
    )
  )
)

;; Add certification (only owner)
(define-public (add-certification (cert (string-ascii 100)))
  (begin
    (ensure-not-paused)
    (let ((profile-opt (map-get? profiles tx-sender)))
      (asserts! (is-some profile-opt) (err ERR-PROFILE-NOT-FOUND))
      (let ((profile (unwrap! profile-opt (err ERR-PROFILE-NOT-FOUND))))
        (try! (validate-string-ascii cert MAX_CERT_LENGTH))
        (asserts! (< (len (get certifications profile)) MAX-CERTIFICATIONS) (err ERR-MAX-CERTIFICATIONS))
        (map-set profiles tx-sender
          (merge profile { certifications: (append (get certifications profile) cert) })
        )
        (print { event: "certification-added", owner: tx-sender, cert: cert })
        (ok true)
      )
    )
  )
)

;; Remove certification (only owner, by index)
(define-public (remove-certification (index uint))
  (begin
    (ensure-not-paused)
    (let ((profile-opt (map-get? profiles tx-sender)))
      (asserts! (is-some profile-opt) (err ERR-PROFILE-NOT-FOUND))
      (let ((profile (unwrap! profile-opt (err ERR-PROFILE-NOT-FOUND))))
        (asserts! (< index (len (get certifications profile))) (err ERR-INVALID-INPUT))
        (let ((certs (get certifications profile))
              (new-certs (filter (lambda (i) (not (is-eq i index))) certs))) ;; Note: filter needs index check, but Clarity list filter is on value, so custom logic
          ;; Custom remove by index
          (let ((left (slice? certs u0 index))
                (right (slice? certs (+ index u1) (len certs))))
            (asserts! (is-some left) (err ERR-INVALID-INPUT))
            (asserts! (is-some right) (err ERR-INVALID-INPUT))
            (map-set profiles tx-sender
              (merge profile { certifications: (concat (unwrap! left (err ERR-INVALID-INPUT)) (unwrap! right (err ERR-INVALID-INPUT))) })
            )
            (print { event: "certification-removed", owner: tx-sender, index: index })
            (ok true)
          )
        )
      )
    )
  )
)

;; Verify profile (admin only)
(define-public (verify-profile (caregiver principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (let ((profile-opt (map-get? profiles caregiver)))
      (asserts! (is-some profile-opt) (err ERR-PROFILE-NOT-FOUND))
      (let ((profile (unwrap! profile-opt (err ERR-PROFILE-NOT-FOUND))))
        (asserts! (not (get is-verified profile)) (err ERR-ALREADY-VERIFIED))
        (map-set profiles caregiver
          (merge profile { is-verified: true })
        )
        (print { event: "profile-verified", caregiver: caregiver })
        (ok true)
      )
    )
  )
)

;; Update reputation (only reputation-updater)
(define-public (update-reputation (caregiver principal) (score-add uint) (review-add uint))
  (begin
    (ensure-not-paused)
    (let ((updater (var-get reputation-updater)))
      (asserts! (or (is-none updater) (is-eq tx-sender (unwrap! updater (err ERR-NOT-AUTHORIZED)))) (err ERR-NOT-AUTHORIZED))
      (asserts! (> score-add u0) (err ERR-INVALID-REPUTATION))
      (let ((profile-opt (map-get? profiles caregiver)))
        (asserts! (is-some profile-opt) (err ERR-PROFILE-NOT-FOUND))
        (let ((profile (unwrap! profile-opt (err ERR-PROFILE-NOT-FOUND))))
          (asserts! (get is-verified profile) (err ERR-NOT-VERIFIED))
          (map-set profiles caregiver
            (merge profile {
              reputation-score: (+ (get reputation-score profile) score-add),
              review-count: (+ (get review-count profile) review-add)
            })
          )
          (print { event: "reputation-updated", caregiver: caregiver, score-add: score-add })
          (ok true)
        )
      )
    )
  )
)

;; Read-only: get profile
(define-read-only (get-profile (caregiver principal))
  (ok (map-get? profiles caregiver))
)

;; Read-only: get reputation score
(define-read-only (get-reputation-score (caregiver principal))
  (let ((profile (map-get? profiles caregiver)))
    (ok (match profile p (get reputation-score p) u0))
  )
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: is paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: get reputation updater
(define-read-only (get-reputation-updater)
  (ok (var-get reputation-updater))
)