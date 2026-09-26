# Furmarks Quiz App

Angular で作成したクイズアプリです。難易度選択、問題の進行、途中再開、成績管理を備えたアプリケーションです。

## 概要

- Firebase を使った認証とデータ保存
- 難易度別のクイズ進行
- 中断したゲームの再開
- ユーザー名の保存と進捗管理
- ポケモン画像を使った装飾付きのインターフェース

## 技術スタック

- Angular 16
- TypeScript
- Firebase
- RxJS
- Bootstrap / ng-bootstrap

## ローカル実行

依存関係をインストールします。

```bash
npm install
```

開発サーバーを起動します。

```bash
npm start
```

ブラウザで次の URL を開いてください。

```text
http://localhost:4200/
```

## Firebase 設定

Firebase の設定値は `src/environments/environment.local.ts` に保存してください。

```bash
cp src/environments/environment.example.ts src/environments/environment.local.ts
```

`firebaseConfig` の中身を自分の Firebase プロジェクトに合わせて書き換えてください。

> `environment.local.ts` は GitHub に含めないでください。

## ビルド

```bash
npm run build
```

## テスト

```bash
npm test
```

## 注意事項

- 公開用リポジトリには資料や内部メモ、画像集などの非公開ファイルは含めていません。
- Firebase の API キーや秘密情報は GitHub にアップロードしないでください。

## 補足

このプロジェクトは学習用・個人利用向けとして整理した公開リポジトリです。アプリ本体とセットアップ情報を中心に簡潔にまとめています。
