<template>
  <q-layout view="hHh lpR fFf">
    <q-header
      bordered
      class="bg-white text-dark"
    >
      <q-toolbar>
        <q-toolbar-title>Mentor AI</q-toolbar-title>
        <q-badge
          color="teal-8"
          outline
        >
          Offline first
        </q-badge>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
