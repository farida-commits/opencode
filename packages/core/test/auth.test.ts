import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { Global } from "@opencode-ai/core/global"
import { Auth } from "@opencode-ai/core/auth"
import { EventV2 } from "@opencode-ai/core/event"
import { tmpdir } from "./fixture/tmpdir"
import { testEffect } from "./lib/effect"

const it = testEffect(Layer.empty)

describe("Auth", () => {
  it.live("stores api credentials", () =>
    Effect.gen(function* () {
      const tmp = yield* Effect.acquireRelease(
        Effect.promise(() => tmpdir()),
        (tmp) => Effect.promise(() => tmp[Symbol.asyncDispose]()),
      )

      const authLayer = Auth.layer.pipe(
        Layer.provide(EventV2.defaultLayer),
        Layer.provide(AppFileSystem.defaultLayer),
        Layer.provide(Global.layerWith({ data: tmp.path })),
      )

      const account = yield* Effect.gen(function* () {
        const auth = yield* Auth.Service
        return yield* auth.create({
          serviceID: Auth.ServiceID.make("anthropic"),
          credential: new Auth.ApiKeyCredential({ type: "api", key: "sk-test" }),
        })
      }).pipe(Effect.provide(authLayer))
      if (!account) throw new Error("expected account to be created")

      const active = yield* Effect.gen(function* () {
        const auth = yield* Auth.Service
        return yield* auth.active(Auth.ServiceID.make("anthropic"))
      }).pipe(Effect.provide(authLayer))

      expect(active?.id).toBe(account.id)
      expect(active?.credential).toEqual({ type: "api", key: "sk-test" })
    }),
  )
})
